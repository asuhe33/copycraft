/**
 * CopyCraft 数据库层 — MySQL 8.0.30 (mysql2/promise)
 *
 * 与 node:sqlite 版本保持**完全相同的导出 API**，只改存储引擎。
 * 下游 server/middleware.js、server/routes/*.js 一个字符都不用动。
 *
 * 连接：环境变量 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 *   默认：127.0.0.1:3306 / root / (空) / copycraft
 */

import mysql from 'mysql2/promise';

const HOST = process.env.DB_HOST || '127.0.0.1';
const PORT = Number(process.env.DB_PORT || 3306);
const USER = process.env.DB_USER || 'root';
const PASSWORD = process.env.DB_PASSWORD || '';
const NAME = process.env.DB_NAME || 'copycraft';

let _pool = null;
function pool() {
  if (_pool) return _pool;
  _pool = mysql.createPool({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // keep dates as strings (bigint 已是 epoch ms 数字，直接读)
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
  return _pool;
}

/** 启动时 warm-up：连一把确认库 & 表就绪，早报错 */
export async function warmup() {
  const c = await pool().getConnection();
  try {
    await c.query('SELECT 1');
  } finally {
    c.release();
  }
}

// ----------------------------------------------------------------------
// 小工具
// ----------------------------------------------------------------------

/** 从行对象（snake_case）转 camelCase（前端契约） */
function rowHistory(r) {
  return {
    id: r.history_id,
    content: r.content,
    platform: r.platform,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deleted: !!r.deleted,
  };
}
function rowUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    password_hash: r.password,
    api_key_enc: r.api_key_enc,
    tone_style: r.tone_style,
    max_length: r.max_length,
    temperature: Number(r.temperature),
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
  };
}

// ----------------------------------------------------------------------
// 用户
// ----------------------------------------------------------------------

export async function createUser({ id, email, passwordHash, createdAt, updatedAt }) {
  await pool().execute(
    `INSERT INTO users (id, email, \`password\`, tone_style, max_length, temperature, created_at, updated_at)
     VALUES (?, ?, ?, '亲切闺蜜', 500, 0.7, ?, ?)`,
    [id, email, passwordHash, createdAt, updatedAt],
  );
}

export async function findUserByEmail(email) {
  const [rows] = await pool().execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rowUser(rows[0]);
}

export async function findUserById(id) {
  const [rows] = await pool().execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rowUser(rows[0]);
}

export async function updateUserSettings(id, { toneStyle, maxLength, temperature, apiKeyEnc, updatedAt }) {
  const sets = ['updated_at = ?'];
  const params = [updatedAt];
  if (toneStyle !== undefined) { sets.push('tone_style = ?'); params.push(toneStyle); }
  if (maxLength !== undefined) { sets.push('max_length = ?'); params.push(maxLength); }
  if (temperature !== undefined) { sets.push('temperature = ?'); params.push(temperature); }
  if (apiKeyEnc !== undefined) { sets.push('api_key_enc = ?'); params.push(apiKeyEnc); }
  params.push(id);
  await pool().execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteUserCascade(id) {
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM `history` WHERE user_id = ?', [id]);
    await conn.execute('DELETE FROM sessions WHERE user_id = ?', [id]);
    await conn.execute('DELETE FROM users WHERE id = ?', [id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ----------------------------------------------------------------------
// 验证码
// ----------------------------------------------------------------------

export async function saveVerifyCode({ email, code, expiresAt, createdAt }) {
  // INSERT ... ON DUPLICATE KEY UPDATE：新 code 覆盖旧
  await pool().execute(
    `INSERT INTO verify_codes (email, code, expires_at, failures, created_at)
     VALUES (?, ?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE code=VALUES(code), expires_at=VALUES(expires_at),
                             failures=0, created_at=VALUES(created_at)`,
    [email, code, expiresAt, createdAt],
  );
}

export async function getVerifyCode(email) {
  const [rows] = await pool().execute('SELECT * FROM verify_codes WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

export async function setVerifyFailures(email, n) {
  await pool().execute('UPDATE verify_codes SET failures = ? WHERE email = ?', [n, email]);
}

export async function deleteVerifyCode(email) {
  await pool().execute('DELETE FROM verify_codes WHERE email = ?', [email]);
}

// ----------------------------------------------------------------------
// session
// ----------------------------------------------------------------------

export async function createSession({ token, userId, deviceName, createdAt, expiresAt }) {
  await pool().execute(
    `INSERT INTO sessions (token, user_id, device_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [token, userId, deviceName ?? null, createdAt, expiresAt],
  );
}

export async function findSession(token) {
  const [rows] = await pool().execute('SELECT * FROM sessions WHERE token = ? LIMIT 1', [token]);
  return rows[0] || null;
}

export async function deleteSession(token) {
  await pool().execute('DELETE FROM sessions WHERE token = ?', [token]);
}

export async function deleteSessionsByUserId(userId) {
  await pool().execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export async function purgeExpiredSessions() {
  const now = Date.now();
  const [r] = await pool().execute('DELETE FROM sessions WHERE expires_at < ?', [now]);
  return r.affectedRows || 0;
}

// ----------------------------------------------------------------------
// history（联合主键 user_id+history_id；最后写入胜出 upsert）
// ----------------------------------------------------------------------

/**
 * 入站 items → MySQL。规则：
 *   - 联合唯一键 (user_id, history_id)
 *   - 仅当 incoming.updated_at >= 当前.updated_at 时写入（最后写入胜出）
 *   - deleted 标记也按同样规则写入
 * 利用 INSERT ... ON DUPLICATE KEY UPDATE 配合条件 VALUES(updated_at) >= 当前值。
 *
 * MySQL 8.0.19+ 起可用 alias 语法：
 *   INSERT INTO t (a,b,...) VALUES (...) AS new(a,b,...)
 *   ON DUPLICATE KEY UPDATE col = IF(new.updated_at >= t.updated_at, new.col, t.col)
 *
 * 返回实际写入条数（通过 affectedRows 累计处理）。
 */
export async function upsertHistory(userId, items) {
  if (!items || items.length === 0) return 0;
  let wrote = 0;
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    for (const it of items) {
      const deleted = it.deleted ? 1 : 0;
      // 经典 VALUES() 写法，兼容 MySQL 8.0.19+ 和 5.7
      const [r] = await conn.execute(
        `INSERT INTO \`history\` (history_id, user_id, content, platform, created_at, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           content      = IF(VALUES(updated_at) >= \`history\`.updated_at, VALUES(content),      \`history\`.content),
           platform     = IF(VALUES(updated_at) >= \`history\`.updated_at, VALUES(platform),     \`history\`.platform),
           created_at   = IF(VALUES(updated_at) >= \`history\`.updated_at, VALUES(created_at),   \`history\`.created_at),
           updated_at   = GREATEST(\`history\`.updated_at, VALUES(updated_at)),
           deleted      = IF(VALUES(updated_at) >= \`history\`.updated_at, VALUES(deleted),      \`history\`.deleted)`,
        [it.id, userId, it.content, it.platform, it.createdAt, it.updatedAt, deleted],
      );
      if (r.affectedRows > 0) wrote += 1;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return wrote;
}

/**
 * 出站：所有 user_id 匹配、updated_at > lastSyncAt 的记录（含 deleted）。
 * 首次 lastSyncAt=null：返全部。
 */
export async function listHistorySince(userId, lastSyncAt) {
  let rows;
  if (lastSyncAt !== null && lastSyncAt !== undefined) {
    [rows] = await pool().execute(
      `SELECT seq, history_id, user_id, content, platform, created_at, updated_at, deleted
       FROM \`history\`
       WHERE user_id = ? AND updated_at > ?
       ORDER BY updated_at ASC`,
      [userId, lastSyncAt],
    );
  } else {
    [rows] = await pool().execute(
      `SELECT seq, history_id, user_id, content, platform, created_at, updated_at, deleted
       FROM \`history\`
       WHERE user_id = ?
       ORDER BY updated_at ASC`,
      [userId],
    );
  }
  return rows.map(rowHistory);
}

/** 清库用 — 完整删除用户的历史（仅内部用；删除账号时走 deleteUserCascade） */
export async function deleteAllHistoryForUser(userId) {
  await pool().execute('DELETE FROM `history` WHERE user_id = ?', [userId]);
}
