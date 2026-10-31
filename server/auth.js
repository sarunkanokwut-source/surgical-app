import crypto from 'node:crypto'
import { db } from './db.js'

const IDLE_MS = (Number(process.env.SESSION_IDLE_HOURS) || 8) * 3600_000
const MAX_MS = (Number(process.env.SESSION_MAX_HOURS) || 24) * 3600_000
export const COOKIE = 'wr_session'

// ─── Passwords (scrypt, no native deps) ──────────────────────────────────────

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(pw, stored) {
  const [scheme, saltB64, hashB64] = String(stored).split('$')
  if (scheme !== 'scrypt') return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = crypto.scryptSync(pw, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 })
  return crypto.timingSafeEqual(expected, actual)
}

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters'
  if (pw.length > 200) return 'Password too long'
  return null
}

// A dummy hash so failed lookups take as long as real ones (no username probing)
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'))
export const checkDummy = (pw) => verifyPassword(pw, DUMMY_HASH)

// ─── Sessions ────────────────────────────────────────────────────────────────

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const now = Date.now()
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(sha(token), userId, now, now)
  return token
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
}

export function destroyUserSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

function lookupSession(token) {
  if (!token) return null
  const now = Date.now()
  const row = db.prepare(`
    SELECT s.token_hash, s.created_at, s.last_seen, u.id, u.username, u.display_name, u.role, u.must_change_password
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND u.active = 1`).get(sha(token))
  if (!row) return null
  if (now - row.last_seen > IDLE_MS || now - row.created_at > MAX_MS) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash)
    return null
  }
  db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(now, row.token_hash)
  return {
    id: row.id, username: row.username, displayName: row.display_name,
    role: row.role, mustChangePassword: !!row.must_change_password,
  }
}

export function pruneSessions() {
  const now = Date.now()
  db.prepare('DELETE FROM sessions WHERE last_seen < ? OR created_at < ?').run(now - IDLE_MS, now - MAX_MS)
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_MS,
  }
}

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export function loadUser(req, _res, next) {
  req.sessionToken = parseCookies(req.headers.cookie)[COOKIE]
  req.user = lookupSession(req.sessionToken)
  next()
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' })
  if (req.user.mustChangePassword && !req.path.startsWith('/auth/')) {
    return res.status(403).json({ error: 'Password change required' })
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  next()
}

// ─── Login throttling (in-memory) ────────────────────────────────────────────

const failures = new Map() // key -> { count, until }
const WINDOW_MS = 15 * 60_000
const MAX_FAILS = 8

export function isLockedOut(key) {
  const f = failures.get(key)
  if (!f) return false
  if (Date.now() > f.until) { failures.delete(key); return false }
  return f.count >= MAX_FAILS
}
export function recordFailure(key) {
  const f = failures.get(key)
  if (!f || Date.now() > f.until) failures.set(key, { count: 1, until: Date.now() + WINDOW_MS })
  else f.count++
}
export function clearFailures(key) { failures.delete(key) }
