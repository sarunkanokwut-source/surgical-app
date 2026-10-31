import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { db, audit } from './db.js'
import {
  COOKIE, hashPassword, verifyPassword, validatePassword, checkDummy,
  createSession, destroySession, destroyUserSessions, pruneSessions, cookieOptions,
  loadUser, requireUser, requireAdmin, isLockedOut, recordFailure, clearFailures,
} from './auth.js'
import { sanitizePatient, validatePatient } from './patient.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const PROD = process.env.NODE_ENV === 'production'

if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY)
app.disable('x-powered-by')

// ─── Security headers ────────────────────────────────────────────────────────

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})

const api = express.Router()
api.use(express.json({ limit: '200kb' }))
api.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
// CSRF: browsers can't send a custom header cross-site without a CORS preflight we never approve
api.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Bad request' })
  next()
})
api.use(loadUser)

// ─── Auth ────────────────────────────────────────────────────────────────────

api.post('/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  const key = `${req.ip}|${username.toLowerCase()}`
  if (isLockedOut(key)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username)
  const ok = user ? verifyPassword(password, user.password_hash) : (checkDummy(password), false)
  if (!ok) {
    recordFailure(key)
    audit(req, 'login_failed', username)
    return res.status(401).json({ error: 'Wrong username or password' })
  }
  clearFailures(key)
  const token = createSession(user.id)
  res.cookie(COOKIE, token, cookieOptions())
  req.user = { id: user.id, username: user.username }
  audit(req, 'login')
  res.json({ user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role, mustChangePassword: !!user.must_change_password } })
})

api.post('/auth/logout', (req, res) => {
  if (req.user) audit(req, 'logout')
  destroySession(req.sessionToken)
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined })
  res.json({ ok: true })
})

api.get('/auth/me', requireUser, (req, res) => res.json({ user: req.user }))

api.post('/auth/password', requireUser, (req, res) => {
  const { current, next } = req.body || {}
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id)
  if (!verifyPassword(String(current || ''), row.password_hash)) return res.status(400).json({ error: 'Current password is wrong' })
  const err = validatePassword(next)
  if (err) return res.status(400).json({ error: err })
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(next), req.user.id)
  // Sign out other devices, keep this one
  destroyUserSessions(req.user.id)
  res.cookie(COOKIE, createSession(req.user.id), cookieOptions())
  audit(req, 'password_changed')
  res.json({ ok: true })
})

// Everything below needs a logged-in user with a non-temporary password
api.use(requireUser)

// ─── Ward / attending lists ──────────────────────────────────────────────────

api.get('/lists', (_req, res) => {
  const rows = db.prepare('SELECT id, kind, name FROM lists ORDER BY name COLLATE NOCASE').all()
  res.json({
    wards: rows.filter(r => r.kind === 'ward'),
    attendings: rows.filter(r => r.kind === 'attending'),
  })
})

api.post('/lists', (req, res) => {
  const kind = req.body?.kind
  const name = String(req.body?.name || '').trim().slice(0, 80)
  if (!['ward', 'attending'].includes(kind) || !name) return res.status(400).json({ error: 'Invalid' })
  db.prepare('INSERT OR IGNORE INTO lists (kind, name) VALUES (?, ?)').run(kind, name)
  audit(req, `${kind}_added`, name)
  res.json({ ok: true })
})

api.delete('/lists/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lists WHERE id = ?').get(Number(req.params.id))
  if (!row) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM lists WHERE id = ?').run(row.id)
  audit(req, `${row.kind}_removed`, row.name)
  res.json({ ok: true })
})

// ─── Patients ────────────────────────────────────────────────────────────────

function toPatient(row) {
  return {
    ...JSON.parse(row.data),
    id: row.id, status: row.status, version: row.version,
    updatedAt: row.updated_at, updatedBy: row.updated_by_name, dischargedAt: row.discharged_at,
  }
}

const SELECT_PATIENT = `
  SELECT p.*, u.display_name AS updated_by_name
  FROM patients p LEFT JOIN users u ON u.id = p.updated_by`

api.get('/patients', (req, res) => {
  const status = req.query.status === 'discharged' ? 'discharged' : 'active'
  const rows = db.prepare(`${SELECT_PATIENT} WHERE p.status = ? ORDER BY p.id`).all(status)
  res.json({ patients: rows.map(toPatient) })
})

api.post('/patients', (req, res) => {
  const data = sanitizePatient(req.body?.data)
  const err = validatePatient(data)
  if (err) return res.status(400).json({ error: err })
  const { lastInsertRowid } = db.prepare('INSERT INTO patients (data, created_by, updated_by) VALUES (?, ?, ?)')
    .run(JSON.stringify(data), req.user.id, req.user.id)
  audit(req, 'patient_created', `#${lastInsertRowid} HN ${data.hn}`)
  res.json({ patient: toPatient(db.prepare(`${SELECT_PATIENT} WHERE p.id = ?`).get(lastInsertRowid)) })
})

api.put('/patients/:id', (req, res) => {
  const id = Number(req.params.id)
  const current = db.prepare('SELECT * FROM patients WHERE id = ?').get(id)
  if (!current) return res.status(404).json({ error: 'Patient not found (may have been deleted)' })
  if (Number(req.body?.version) !== current.version) {
    return res.status(409).json({ error: 'Someone else just updated this patient. Close and reopen it to see their changes, then re-apply yours.' })
  }
  const data = sanitizePatient(req.body?.data)
  const err = validatePatient(data)
  if (err) return res.status(400).json({ error: err })
  const status = req.body?.status === 'discharged' ? 'discharged' : 'active'
  const dischargedAt = status === 'discharged' ? (current.discharged_at || new Date().toISOString().slice(0, 10)) : null
  db.prepare(`UPDATE patients SET data = ?, status = ?, discharged_at = ?, version = version + 1,
              updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(data), status, dischargedAt, req.user.id, id)
  audit(req, status !== current.status ? `patient_${status}` : 'patient_updated', `#${id} HN ${data.hn}`)
  res.json({ patient: toPatient(db.prepare(`${SELECT_PATIENT} WHERE p.id = ?`).get(id)) })
})

api.delete('/patients/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM patients WHERE id = ?').run(id)
  audit(req, 'patient_deleted', `#${id} HN ${JSON.parse(row.data).hn}`)
  res.json({ ok: true })
})

api.post('/patients/purge', requireAdmin, (req, res) => {
  const days = Math.max(parseInt(req.body?.days) || 0, 0)
  const { changes } = db.prepare(`DELETE FROM patients WHERE status = 'discharged' AND discharged_at <= date('now', ?)`)
    .run(`-${days} days`)
  audit(req, 'patients_purged', `${changes} discharged > ${days}d`)
  res.json({ deleted: changes })
})

// ─── Users (admin) ───────────────────────────────────────────────────────────

const publicUser = (u) => ({
  id: u.id, username: u.username, displayName: u.display_name, role: u.role,
  active: !!u.active, mustChangePassword: !!u.must_change_password, createdAt: u.created_at,
})

api.get('/users', requireAdmin, (_req, res) => {
  res.json({ users: db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser) })
})

api.post('/users', requireAdmin, (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const displayName = String(req.body?.displayName || '').trim().slice(0, 80) || username
  const role = req.body?.role === 'admin' ? 'admin' : 'user'
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Username: 3–32 chars, a–z 0–9 . _ -' })
  const err = validatePassword(req.body?.password)
  if (err) return res.status(400).json({ error: err })
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return res.status(400).json({ error: 'Username taken' })
  db.prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(username, displayName, hashPassword(req.body.password), role)
  audit(req, 'user_created', username)
  res.json({ ok: true })
})

api.put('/users/:id', requireAdmin, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id))
  if (!u) return res.status(404).json({ error: 'Not found' })
  const { displayName, role, active, password } = req.body || {}
  if (u.id === req.user.id && (active === false || role === 'user')) {
    return res.status(400).json({ error: "You can't demote or deactivate yourself" })
  }
  if (displayName !== undefined) db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(String(displayName).trim().slice(0, 80) || u.username, u.id)
  if (role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role === 'admin' ? 'admin' : 'user', u.id)
  if (active !== undefined) {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, u.id)
    if (!active) destroyUserSessions(u.id)
  }
  if (password !== undefined) {
    const err = validatePassword(password)
    if (err) return res.status(400).json({ error: err })
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hashPassword(password), u.id)
    destroyUserSessions(u.id)
  }
  audit(req, 'user_updated', `${u.username}: ${Object.keys(req.body || {}).filter(k => k !== 'password' || password).join(', ')}`)
  res.json({ ok: true })
})

api.get('/audit', requireAdmin, (_req, res) => {
  res.json({ entries: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all() })
})

api.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use('/api', api)

// ─── Static frontend ─────────────────────────────────────────────────────────

const DIST = path.resolve('dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }))
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

// Optional retention policy: auto-delete discharged patients after N days
const AUTO_PURGE_DAYS = Number(process.env.AUTO_PURGE_DAYS) || 0
function housekeeping() {
  pruneSessions()
  if (AUTO_PURGE_DAYS > 0) {
    db.prepare(`DELETE FROM patients WHERE status = 'discharged' AND discharged_at <= date('now', ?)`).run(`-${AUTO_PURGE_DAYS} days`)
  }
}
housekeeping()
setInterval(housekeeping, 3600_000).unref()

if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  console.warn('No users yet. Create the first admin with:  npm run create-admin -- <username> <password>')
}

app.listen(PORT, () => console.log(`Ward Round server on http://localhost:${PORT}`))
