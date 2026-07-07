import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  DB_HOST: '127.0.0.1', DB_PORT: '3307',
  DB_USER: 'root', DB_PASSWORD: '123456',
  DB_NAME: 'copycraft',
  JWT_SECRET: 'e2e-mysql-' + Date.now(),
};

const srv = spawn('node', ['server/index.js'], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => process.stdout.write(`[srv] ${d}`));
srv.stderr.on('data', d => process.stderr.write(`[srv!] ${d}`));

const wait = ms => new Promise(r => setTimeout(r, ms));
async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch('http://localhost:3001' + path, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  try { return { status: r.status, body: JSON.parse(txt) }; }
  catch { return { status: r.status, body: txt }; }
}
let fail = 0;
const ck = (n, c) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) fail++; };

try {
  await wait(2500);

  const h = await call('GET', '/api/health');
  check('health', h.status === 200 && h.body.db === 'ok' && h.body.sync === true);

  const rc = await call('POST', '/api/auth/request-code', { email: 'mysql@t.com', mode: 'register' });
  check('code', rc.status === 200 && rc.body.devOnly === true);
  const code = rc.body.code;

  const v = await call('POST', '/api/auth/verify-code', { email: 'mysql@t.com', code, password: 'pw123456', mode: 'register' });
  check('verify', v.status === 200 && !!v.body.token);
  const token = v.body.token;

  const h1 = await call('POST', '/api/sync/history', {
    items: [
      { id: 'a', content: 'h-xhs', platform: 'xiaohongshu', createdAt: 1700000000000, updatedAt: 1700000001000, deleted: 0 },
      { id: 'b', content: 'h-wb', platform: 'weibo', createdAt: 1700000000000, updatedAt: 1700000002000, deleted: 0 },
    ],
    lastSyncAt: null,
  }, token);
  check('inbound =2', h1.body.pushed === 2);

  const h2 = await call('POST', '/api/sync/history', { items: [], lastSyncAt: null }, token);
  check('outbound =2', Array.isArray(h2.body.items) && h2.body.items.length === 2);

  const s1 = await call('POST', '/api/sync/settings', {
    apikeyEnc: 'sk-hosted-test',
    toneStyle: '幽默',
    maxLength: 800,
    temperature: 0.9,
    updatedAt: Date.now() + 1000,
  }, token);
  check('settings accepted', s1.status === 200 && s1.body.accepted === true && s1.body.settings.apikeyPlain === 'sk-hosted-test');

  const me = await call('GET', '/api/account/me', null, token);
  check('me hasKey', me.status === 200 && me.body.user.hasApiKey === true);

  const del1 = await call('DELETE', '/api/account/', null, token);
  check('delete', del1.status === 200 && del1.body.ok === true);

  const me2 = await call('GET', '/api/account/me', null, token);
  check('after delete 401', me2.status === 401);

} catch (e) {
  console.error('EXC:', e);
  fail++;
} finally {
  srv.kill();
}

console.log(fail === 0 ? '\nMySQL E2E PASS ✅' : `\nFAIL ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);

function check(n, c) { ck(n, c); }
