import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.DB_PATH || path.resolve('data', 'ward.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    active        INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lists (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    kind  TEXT NOT NULL CHECK (kind IN ('ward', 'attending')),
    name  TEXT NOT NULL,
    UNIQUE (kind, name)
  );

  CREATE TABLE IF NOT EXISTS patients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discharged')),
    data        TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    created_by  INTEGER REFERENCES users(id),
    updated_by  INTEGER REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    discharged_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    at        TEXT NOT NULL DEFAULT (datetime('now')),
    user_id   INTEGER,
    username  TEXT,
    action    TEXT NOT NULL,
    target    TEXT,
    ip        TEXT
  );
`)

export function audit(req, action, target = null) {
  db.prepare('INSERT INTO audit_log (user_id, username, action, target, ip) VALUES (?, ?, ?, ?, ?)')
    .run(req.user?.id ?? null, req.user?.username ?? req.body?.username ?? null, action, target, req.ip ?? null)
}
