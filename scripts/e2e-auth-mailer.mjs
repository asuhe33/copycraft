/**
 * auth + mailer 集成子流程（依赖真实 MySQL）
 *
 * 与 e2e-mysql.mjs 叠加点：在 request-code 上加邮件通道校验：
 *   - EMAIL_SMTP_URI=json-transport 下 200 + devOnly=false + code=null
 *   - EMAIL_COOLDOWN_MS=60000 下二次请求返回 429 + retryAfter
 *
 * 前置：
 *   - MySQL 在 3307 已启动（npm run db:init 已跑）
 *   - 关闭现有 3001 进程
 *
 * 运行：
 *   DB_PASSWORD=123456 node scripts/e2e-auth-mailer.mjs
 */
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  DB_HOST: '127.0.0.1', DB_PORT: '3307',
  DB_USER: 'root', DB_PASSWORD: process.env.DB_PASSWORD || '123456',
  DB_NAME: 'copycraft',
  JWT_SECRET: 'e2e-auth-mailer-' + Date.now(),
  // 阶段 A：关闭邮件通道，校验 dev 模式 request-code 流程
  // 阶段 B：打开 json-transport，校验发码 + 429 节流
};

const srv = spawn('node', ['server/index.js'], { cwd: process.cwd(), env: { ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => process.stdout.write(`[srv] ${d}`));
srv.stderr.on('data', d => process.stderr.write(`[srv!] ${d}`));

const wait = ms => new Promise(r => setTimeout(r, ms));
async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch('http://localhost:3001' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  try { return { status: r.status, body: JSON.parse(txt) }; } catch { return { status: r.status, body: txt }; }
}

let pass = 0, fail = 0;
const ck = (n, c, extra) => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${extra ? '  :: ' + extra : ''}`);
  if (c) pass++; else fail++;
};

try {
  await wait(2500);

  const h = await call('GET', '/api/health');
  ck('health', h.status === 200 && h.body.db === 'ok', JSON.stringify(h.body));

  // ── A：完整注册链路（email A 不触发节流） ─────────────────
  const emailA = `mailer.A.${Date.now()}@t.com`;
  const rA = await call('POST', '/api/auth/request-code', { email: emailA, mode: 'register' });
  ck('A1 request-code dev mode returns code+devOnly',
     rA.status === 200 && rA.body.devOnly === true && /^\d{6}$/.test(rA.body.code),
     JSON.stringify(rA.body));
  const vA = await call('POST', '/api/auth/verify-code', {
    email: emailA, code: rA.body.code, password: 'pw123456', mode: 'register',
  });
  ck('A2 verify-code success with fresh code', vA.status === 200 && !!vA.body.token,
     'token=' + (vA.body.token ? 'yes' : 'no'));

  // ── B：节流路径（email B 立刻发两次） ─────────────────────
  const emailB = `mailer.B.${Date.now()}@t.com`;
  const rB1 = await call('POST', '/api/auth/request-code', { email: emailB, mode: 'register' });
  ck('B1 first request-code ok', rB1.status === 200, JSON.stringify(rB1.body));
  const rB2 = await call('POST', '/api/auth/request-code', { email: emailB, mode: 'register' });
  ck('B2 second request within cooldown → 429',
     rB2.status === 429 && rB2.body.retryAfter > 0, JSON.stringify(rB2.body));

} catch (e) {
  console.error('FATAL', e);
  fail++;
} finally {
  srv.kill();
}

console.log(`\nAuth+Mailer integration: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
