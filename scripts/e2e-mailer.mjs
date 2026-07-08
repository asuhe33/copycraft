/**
 * 邮箱服务 E2E（子进程隔离）
 *
 * 3 个用例，每项都在子进程里起一个 fresh Node，强制不同的环境变量组合：
 *   1. DEV 模式（无 EMAIL_*）             → sendVerifyCode 必须返回 { code, devOnly:true }
 *      且连发两次在 EMAIL_COOLDOWN_MS=60000 下要抛 CooldownError（name="CooldownError"）
 *   2. SMTP 模式（json-transport）
 *      nodemailer 的 jsonTransport 不发真实邮件，结构化返回；
 *      校验：devOnly=false、code=null、messageId 已赋值
 *   3. 真实 SMTP 失败传播到 caller（端口 1 不可达）
 *
 * 运行：node scripts/e2e-mailer.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runCase({ env, script, timeout = 15000 }) {
  const proc = spawnSync(process.execPath, ['-e', script], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
    timeout,
  });
  return { code: proc.status, out: proc.stdout || '', err: proc.stderr || '' };
}

let pass = 0, fail = 0;
const ck = (n, c, extra) => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${extra ? '  :: ' + extra : ''}`);
  if (c) pass++; else fail++;
};

function lastJson(out) {
  const lines = out.split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch {}
  }
  return null;
}

// ── CASE 1：dev 模式 + 节流 ─────────────────────────────────────────────
const devCase = `
import { sendVerifyCode } from './server/mailer.js';
const out = {};
try {
  const r1 = await sendVerifyCode('case1@t.com', '123456');
  out.first = r1;
  out.cooldownThrew = false; out.retryAfter = 0; out.cooldownName = null;
  try {
    await sendVerifyCode('case1@t.com', '654321');
  } catch (e) {
    out.cooldownThrew = true;
    out.retryAfter = e.retryAfter || 0;
    out.cooldownName = e.name;
  }
} catch (e) { out.error = String(e); }
console.log(JSON.stringify(out));
`;
{
  const r = runCase({ env: { EMAIL_COOLDOWN_MS: '60000' }, script: devCase });
  const p = lastJson(r.out);
  ck('1a dev mode returns code+devOnly',
     p && p.first && p.first.code === '123456' && p.first.devOnly === true,
     JSON.stringify(p && p.first));
  ck('1b cooldown triggers CooldownError',
     p && p.cooldownThrew === true && p.cooldownName === 'CooldownError' && p.retryAfter > 0,
     JSON.stringify(p && { cooldownThrew: p.cooldownThrew, retryAfter: p.retryAfter }));
}

// ── CASE 2：SMTP 模式（json-transport） ───────────────────────────────
const smtpCase = `
import { sendVerifyCode } from './server/mailer.js';
const out = {};
try {
  const r = await sendVerifyCode('case2@t.com', '987654');
  out.result = r;
} catch (e) { out.error = String(e && e.message || e); }
console.log(JSON.stringify(out));
`;
{
  const r = runCase({
    env: { EMAIL_SMTP_URI: 'smtp://localhost:0/?jsonTransport=true', EMAIL_COOLDOWN_MS: '0' },
    script: smtpCase,
  });
  const p = lastJson(r.out);
  const ok = p && p.result && p.result.devOnly === false && p.result.code === null
    && typeof p.result.messageId === 'string' && p.result.messageId.length > 0;
  ck('2 smtp mode returns devOnly=false, code=null, messageId', ok,
     JSON.stringify(p && p.result));
}

// ── CASE 3：SMTP 失败传播 ─────────────────────────────────────────────
const failCase = `
import { sendVerifyCode } from './server/mailer.js';
const out = {};
try {
  await sendVerifyCode('case3@t.com', '000000');
  out.threw = false;
} catch (e) {
  out.threw = true;
  out.errMsg = String(e && e.message || e).slice(0, 160);
}
console.log(JSON.stringify(out));
`;
{
  const r = runCase({
    env: { EMAIL_SMTP_URI: 'smtp://127.0.0.1:1/', EMAIL_COOLDOWN_MS: '0' },
    script: failCase,
    timeout: 10000,
  });
  const p = lastJson(r.out);
  ck('3 smtp failure propagates to caller', p && p.threw === true,
     JSON.stringify(p));
}

console.log(`\nMailer E2E: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
