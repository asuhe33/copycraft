/**
 * CopyCraft 数据库层 — node:sqlite
 *
 * 启动需加 flag： --experimental-sqlite（已在 package.json 的 npm scripts 配好）。
 * 本目录是 ESM（package.json type=module），故用 import。
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'copycraft.db');

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL;');
  _db.exec('PRAGMA foreign_keys = ON;');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      api_key_enc   TEXT,
      tone_style    TEXT NOT NULL DEFAULT '亲切闺蜜',
      max_length    INTEGER NOT NULL DEFAULT 500,
      temperature   REAL NOT NULL DEFAULT 0.7,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verify_codes (
      email      TEXT PRIMARY KEY,
      code       TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      failures   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      device_name TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history (
      id         TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      content    TEXT NOT NULL,
      platform   TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_history_user_updated ON history(user_id, updated_at);
  `);
}

function createUser({ id, email, passwordHash, createdAt, updatedAt }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, tone_style, max_length, temperature, created_at, updated_at)
    VALUES (?, ?, ?, '亲切闺蜜', 500, 0.7, ?, ?)
  `).run(id, email, passwordHash, createdAt, updatedAt);
}

function findUserByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function findUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function updateUserSettings(id, { toneStyle, maxLength, temperature, apiKeyEnc, updatedAt }) {
  const db = getDb();
  const sets = ['updated_at = ?'];
  const params = [updatedAt];
  if (toneStyle !== undefined) { sets.push('tone_style = ?'); params.push(toneStyle); }
  if (maxLength !== undefined) { sets.push('max_length = ?'); params.push(maxLength); }
  if (temperature !== undefined) { sets.push('temperature = ?'); params.push(temperature); }
  if (apiKeyEnc !== undefined) { sets.push('api_key_enc = ?'); params.push(apiKeyEnc); }
  params.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

function deleteUserCascade(id) {
  const db = getDb();
  db.prepare('DELETE FROM history WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function saveVerifyCode({ email, code, expiresAt, createdAt }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO verify_codes (email, code, expires_at, failures, created_at)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(email) DO UPDATE SET code=excluded.code, expires_at=excluded.expires_at,
                                       failures=0, created_at=excluded.created_at
  `).run(email, code, expiresAt, createdAt);
}

function getVerifyCode(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM verify_codes WHERE email = ?').get(email) || null;
}

function setVerifyFailures(email, n) {
  const db = getDb();
  db.prepare('UPDATE verify_codes SET failures = ? WHERE email = ?').run(n, email);
}

function deleteVerifyCode(email) {
  const db = getDb();
  db.prepare('DELETE FROM verify_codes WHERE email = ?').run(email);
}

function createSession({ token, userId, deviceName, createdAt, expiresAt }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO sessions (token, user_id, device_name, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, deviceName ?? null, createdAt, expiresAt);
}

function findSession(token) {
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) || null;
}

function deleteSession(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function deleteSessionsByUserId(userId) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

function purgeExpiredSessions() {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

function upsertHistory(userId, items) {
  const db = getDb();
  let count = 0;
  const find = db.prepare('SELECT updated_at FROM history WHERE id = ? AND user_id = ?');
  const update = db.prepare(`
    UPDATE history SET content=?, platform=?, created_at=?, updated_at=?, deleted=?
    WHERE id=? AND user_id=?
  `);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO history (id, user_id, content, platform, created_at, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrUpdate = db.prepare(`
    INSERT INTO history (id, user_id, content, platform, created_at, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id, user_id) DO UPDATE SET
      content=excluded.content, platform=excluded.platform,
      created_at=excluded.created_at, updated_at=excluded.updated_at,
      deleted=excluded.deleted
      WHERE excluded.updated_at >= history.updated_at
  `);
  const txn = db.prepare('BEGIN');
  try {
    txn.run();
    for (const it of items) {
      insertOrUpdate.run(it.id, userId, it.content, it.platform, it.createdAt, it.updatedAt, it.deleted ? 1 : 0);
      count++;
    }
    db.prepare('COMMIT').run();
  } catch (e) {
    try { db.prepare('ROLLBACK').run(); } catch {}
    throw e;
  }
  return count;
}

function listHistorySince(userId, lastSyncAt) {
  const db = getDb();
  if (lastSyncAt) {
    return db.prepare(`
      SELECT id, content, platform, created_at AS createdAt, updated_at AS updatedAt, deleted
      FROM history WHERE user_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(userId, lastSyncAt);
  }
  return db.prepare(`
    SELECT id, content, platform, created_at AS createdAt, updated_at AS updatedAt, deleted
    FROM history WHERE user_id = ?
    ORDER BY updated_at ASC
  `).all(userId);
}

export {
  getDb,
  createUser,
  findUserByEmail,
  findUserById,
  updateUserSettings,
  deleteUserCascade,
  saveVerifyCode,
  getVerifyCode,
  setVerifyFailures,
  deleteVerifyCode,
  createSession,
  findSession,
  deleteSession,
  deleteSessionsByUserId,
  purgeExpiredSessions,
  upsertHistory,
  listHistorySince,
};
