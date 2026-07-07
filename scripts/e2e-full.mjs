// 端到端：启后端 → 启前端（带 proxy）or 单独后端联调；这里集中测试后端 + 登录+删库流程
// 用法：node scripts/e2e-full.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const DB_PATH = path.join(root, '.e2e.db');

for (const s of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + s, { force: true });

const server = spawn('node', ['--experimental-sqlite', 'server/index.js'], {
  cwd: root,
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
  try { return { status: r.status, body: await r.json() }; }
  catch { return { status: r.status, body: null }; }
}
async function get(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  try { return { status: r.status, body: await r.json() }; }
  catch { return { status: r.status, body: null }; }
}
async function del(url, token) {
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  try { return { status: r.status, body: await r.json() }; }
  catch { return { status: r.status, body: null }; }
}

let failures = 0;
const check = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) failures++; };

try {
  await wait(1500);

  // 1. health
  const h = await get('http://localhost:3001/api/health');
  check('health ok', h.status === 200 && h.body.status === 'ok');

  // 2. register
  const rc = await post('http://localhost:3001/api/auth/request-code', { email: 'u@x.com', mode: 'register' });
  check('code returns', rc.status === 200 && rc.body.devOnly === true);
  const code = rc.body.code;
  check('code 6-digit', /^\d{6}$/.test(code));

  // 3. verify
  const v = await post('http://localhost:3001/api/auth/verify-code', { email: 'u@x.com', code, password: 'pw123456', mode: 'register' });
  check('verify ok', v.status === 200 && !!v.body.token);
  const token = v.body.token;

  // 4. sync settings (托管 key)
  const s = await post('http://localhost:3001/api/sync/settings', {
    apikeyEnc: 'sk-hosted-test',
    toneStyle: '幽默',
    maxLength: 800,
    temperature: 0.9,
    updatedAt: Date.now() + 1000,
  }, token);
  check('settings accepted', s.status === 200 && s.body.accepted === true);
  check('apikeyPlain returned', s.body.settings.apikeyPlain === 'sk-hosted-test');

  // 5. history inbound
  const h1 = await post('http://localhost:3001/api/sync/history', {
    items: [
      { id: 'a', content: 'xhs1', platform: 'xiaohongshu', createdAt: 1700000000000, updatedAt: 1700000001000, deleted: 0 },
    ],
    lastSyncAt: null,
  }, token);
  check('history inbound pushed=1', h1.body.pushed === 1);

  // 6. history outbound
  const h2 = await post('http://localhost:3001/api/sync/history', { items: [], lastSyncAt: null }, token);
  check('history outbound count=1', h2.body.items.length === 1);

  // 7. me
  const me = await get('http://localhost:3001/api/account/me', token);
  check('me.hasApiKey true', me.status === 200 && me.body.user.hasApiKey === true);

  // 8. delete account
  const del1 = await del('http://localhost:3001/api/account/', token);
  check('delete account ok', del1.status === 200 && del1.body.ok === true);

  // 9. token revoked
  const me2 = await get('http://localhost:3001/api/account/me', token);
  check('token revoked', me2.status === 401);

} catch (e) {
  console.error('异常:', e);
  failures++;
} finally {
  server.kill();
  for (const s of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + s, { force: true });
}

console.log(failures === 0 ? '\nPASS ✅' : `\nFAIL (${failures}) ❌`);
process.exit(failures === 0 ? 0 : 1);
