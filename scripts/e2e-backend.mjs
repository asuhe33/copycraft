// 端到端后端联调脚本：启服务 -> 注册 -> 登录 -> 同步 -> 校验 -> 清理
// 用法：node scripts/e2e-backend.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const DB_PATH = (process.env.TEMP || process.env.TMPDIR || '/tmp') + '/cc_e2e.db';
fs.rmSync(DB_PATH + '-wal', { force: true });
fs.rmSync(DB_PATH + '-shm', { force: true });
fs.rmSync(DB_PATH, { force: true });

const server = spawn('node', ['--experimental-sqlite', 'server/index.js'], {
  env: { ...process.env, JWT_SECRET: 'e2e-test', DB_PATH },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', d => process.stdout.write(`[srv] ${d}`));
server.stderr.on('data', d => process.stderr.write(`[srv!] ${d}`));

const wait = ms => new Promise(r => setTimeout(r, ms));

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const t = await r.text();
  try { return { status: r.status, body: JSON.parse(t) }; }
  catch { return { status: r.status, body: t }; }
}
async function get(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const txt = await r.text();
  try { return { status: r.status, body: JSON.parse(txt) }; }
  catch { return { status: r.status, body: txt }; }
}

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  // 等服务启动
  await wait(1500);

  // 1. health
  const h = await get('http://localhost:3001/api/health');
  check('health returns status=ok', h.status === 200 && h.body.status === 'ok' && h.body.sync === true);

  // 2. request-code register
  const rc = await post('http://localhost:3001/api/auth/request-code', { email: 'u@x.com', mode: 'register' });
  check('request-code returns 200', rc.status === 200);
  check('request-code devOnly=true & has code', rc.body.devOnly === true && /^\d{6}$/.test(rc.body.code));
  const code = rc.body.code;

  // 3. 注册：verify-code with password & mode=register
  const v1 = await post('http://localhost:3001/api/auth/verify-code', {
    email: 'u@x.com', code, password: 'pw123456', mode: 'register',
  });
  check('register verify returns 200', v1.status === 200);
  check('register returns token & user', !!v1.body.token && v1.body.user?.email === 'u@x.com');
  const token = v1.body.token;

  // 4. 重复注册：应 409
  const rc2 = await post('http://localhost:3001/api/auth/request-code', { email: 'u@x.com', mode: 'register' });
  check('duplicate register -> 409', rc2.status === 409);

  // 5. sync history 入站
  const inb = await post('http://localhost:3001/api/sync/history', {
    items: [
      { id: 'res_a', content: 'hello-xhs', platform: 'xiaohongshu', createdAt: 1700000000000, updatedAt: 1700000001000, deleted: 0 },
      { id: 'res_b', content: 'hello-wb', platform: 'weibo', createdAt: 1700000000000, updatedAt: 1700000002000, deleted: 0 },
    ],
    lastSyncAt: null,
  }, token);
  check('inbound sync ok', inb.status === 200 && inb.body.pushed === 2);

  // 6. sync history 出站
  const out = await post('http://localhost:3001/api/sync/history', { items: [], lastSyncAt: null }, token);
  check('outbound returns 2 rows', Array.isArray(out.body.items) && out.body.items.length === 2);
  check('items have serverAt', typeof out.body.serverAt === 'number');

  // 7. settings 入站（托管 API Key + 偏好）
  const futureTs = Date.now() + 60_000;
  const s1 = await post('http://localhost:3001/api/sync/settings', {
    apikeyEnc: 'sk-plain-mock-key',
    toneStyle: '幽默',
    maxLength: 800,
    temperature: 0.9,
    updatedAt: futureTs,
  }, token);
  check('settings accepted', s1.status === 200 && s1.body.accepted === true);
  check('settings returns decrypted apikeyPlain', s1.body.settings?.apikeyPlain === 'sk-plain-mock-key');

  // 8. me
  const me = await get('http://localhost:3001/api/account/me', token);
  check('me returns user', me.status === 200 && me.body.user?.email === 'u@x.com');
  check('me.hasApiKey true', me.body.user?.hasApiKey === true);

  // 9. 401 on bad token
  const bad = await get('http://localhost:3001/api/account/me', 'garbage.token');
  check('bad token -> 401', bad.status === 401);

  // 10. logout
  const lg = await post('http://localhost:3001/api/auth/logout', {}, token);
  check('logout ok', lg.status === 200);

  // 11. token 吊销
  const after = await get('http://localhost:3001/api/account/me', token);
  check('token revoked after logout -> 401', after.status === 401);

} catch (e) {
  console.error('E2E 异常:', e);
  failures++;
} finally {
  server.kill();
}

console.log(failures === 0 ? '\nPASS ✅' : `\nFAIL (${failures}) ❌`);
process.exit(failures === 0 ? 0 : 1);
