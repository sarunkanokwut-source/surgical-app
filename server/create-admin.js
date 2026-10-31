// Usage: npm run create-admin -- <username> <password> ["Display Name"]
// Creates an admin, or resets an existing user's password and makes them admin.
import { db } from './db.js'
import { hashPassword, validatePassword } from './auth.js'

const [username, password, displayName] = process.argv.slice(2)
if (!username || !password) {
  console.error('Usage: npm run create-admin -- <username> <password> ["Display Name"]')
  process.exit(1)
}
const err = validatePassword(password)
if (err) { console.error(err); process.exit(1) }

const name = username.trim().toLowerCase()
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(name)
if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, role = 'admin', active = 1, must_change_password = 0 WHERE id = ?")
    .run(hashPassword(password), existing.id)
  console.log(`Updated ${name}: admin, password reset.`)
} else {
  db.prepare("INSERT INTO users (username, display_name, password_hash, role, must_change_password) VALUES (?, ?, ?, 'admin', 0)")
    .run(name, displayName || name, hashPassword(password))
  console.log(`Created admin ${name}.`)
}
