/**
 * CopyCraft MySQL 一键初始化脚本（ESM）。
 *
 * 用法：
 *   npm run db:init
 *   或：  node server/db_init.js
 *   或：  DB_PASSWORD=123456 node server/db_init.js
 *
 * 环境变量（与 db.js 共用）：
 *   DB_HOST      默认 127.0.0.1
 *   DB_PORT      默认 3306（你 3307 请 export DB_PORT=3307）
 *   DB_USER      默认 root
 *   DB_PASSWORD  （必填）
 *   DB_NAME      默认 copycraft
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOST = process.env.DB_HOST || '127.0.0.1';
const PORT = Number(process.env.DB_PORT || 3306);
const USER = process.env.DB_USER || 'root';
const PASSWORD = process.env.DB_PASSWORD || '';
const NAME = process.env.DB_NAME || 'copycraft';

async function main() {
  if (!PASSWORD) {
    console.error('\n[db:init] 请设置 DB_PASSWORD 环境变量。');
    console.error('  示例：    DB_PASSWORD=123456 npm run db:init\n');
    process.exit(1);
  }

  const sqlFile = path.join(__dirname, 'db_init.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('[db:init] 找不到', sqlFile);
    process.exit(1);
  }

  console.log(`[db:init] 连 MySQL ${HOST}:${PORT} …`);
  const conn = await mysql.createConnection({
    host: HOST, port: PORT, user: USER, password: PASSWORD,
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`[db:init] 执行 db_init.sql (${sql.length} 字符)…`);
    await conn.query(sql);
  } finally {
    await conn.end();
  }

  // warm-up 库连接（确认库 & 表OK）
  const conn2 = await mysql.createConnection({
    host: HOST, port: PORT, user: USER, password: PASSWORD, database: NAME,
  });
  try {
    const [rows] = await conn2.query('SHOW TABLES');
    console.log(`\n[db:init] ✅ copycraft MySQL 初始化完成`);
    console.log(`  库：${NAME}@${HOST}:${PORT}`);
    console.log(`  表：${rows.map((r) => Object.values(r)[0]).join(', ')}\n`);
  } finally {
    await conn2.end();
  }
}

main().catch((e) => {
  console.error('\n[db:init] ❌ 失败:', e.message || e);
  process.exit(1);
});
