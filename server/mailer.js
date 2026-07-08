/**
 * 邮件通道（ESM）
 *
 * 支持两种真实邮件后端（都是 opt-in；不设环境变量 = dev 模式，流程不变）：
 *   1. SMTP（最广兼容，推荐生产）
 *        必填任一：
 *          EMAIL_SMTP_URI=smtps://user:pass@smtp.example.com:465
 *        或分开填：
 *          EMAIL_SMTP_HOST / EMAIL_SMTP_PORT / EMAIL_SMTP_USER / EMAIL_SMTP_PASS / EMAIL_SMTP_SECURE
 *   2. Resend（API-first）
 *        EMAIL_PROVIDER=resend  +  RESEND_API_KEY=re_xxx
 *
 * 上游调用约定兼容旧版：
 *   { code, devOnly, messageId? }
 *   - 没配真实通道  → { code, devOnly:true }     （前端弹窗流程保留）
 *   - 配了，发送 OK → { code:null, devOnly:false, messageId }
 *   - 配了，发送失败→ throw（调用方 500 + 前端提示"邮件通道异常"）
 *
 * 安全约束（auth.js 之外的兜底）：
 *   - 同一邮箱两次发送间隔 >= EMAIL_COOLDOWN_MS（默认 60s）
 *   - 任何情形下都不在日志里输出验证码（prod 下不 log email/code）
 *
 * 测试：npx node --test tests/mailer.int.test.mjs
 *       （spin up 一个本地假 SMTP，命中 smtp://localhost:PORT，验证 HTML/节流/失败）
 */

import nodemailer from 'nodemailer';
import process from 'node:process';

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || '').toLowerCase();
const SMTP_URI = process.env.EMAIL_SMTP_URI || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const IS_PROD = !!SMTP_URI || (EMAIL_PROVIDER === 'resend' && !!RESEND_API_KEY);

const FROM = process.env.MAIL_FROM || 'CopyCraft <no-reply@copycraft.app>';
const CODE_TTL = Number(process.env.VERIFY_CODE_TTL || 600);
const COOLDOWN_MS = Number(process.env.EMAIL_COOLDOWN_MS || 60_000);

let _transport = null;
let _transportKind = null;

// email → timestamp；进程重启清；内存防护上限 1000 条
const _lastSent = new Map();

async function getTransport() {
  if (_transport) return { t: _transport, kind: _transportKind };
  if (SMTP_URI) {
    _transport = nodemailer.createTransport(SMTP_URI);
    _transportKind = 'smtp';
  } else if (EMAIL_PROVIDER === 'resend' && RESEND_API_KEY) {
    _transport = null;
    _transportKind = 'resend';
  } else {
    _transport = null;
    _transportKind = 'dev';
  }
  return { t: _transport, kind: _transportKind };
}

const SUBJECT = '【CopyCraft】您的验证码';
const TTL_MIN = CODE_TTL / 60;
const BODY_TEXT =
  '您的验证码是 {CODE}，{TTL} 分钟内有效。如非本人操作请忽略此邮件。';
const BODY_HTML =
  '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;' +
    'max-width:480px;margin:0 auto;padding:24px;color:#1f2937">' +
  '<h2 style="font-size:20px;margin:0 0 16px">CopyCraft · 登录验证码</h2>' +
  '<p style="margin:0 0 16px">您正在使用 CopyCraft，验证码如下（{TTL} 分钟内有效）：</p>' +
  '<div style="font-size:32px;font-weight:700;letter-spacing:8px;' +
    'background:#f5f3ff;border-radius:12px;padding:16px 24px;' +
    'text-align:center;color:#6d28d9;margin:0 0 24px">{CODE}</div>' +
  '<p style="font-size:13px;color:#6b7280;margin:0">' +
    '如果您没有发起此操作，请忽略此邮件。<br>此验证码 {TTL} 分钟后自动过期。</p>' +
  '</div>';

function renderTpl(tpl, code) {
  return tpl.replaceAll('{CODE}', code).replaceAll('{TTL}', String(TTL_MIN));
}

async function sendViaSmtp(t, email, code) {
  const info = await t.sendMail({
    from: FROM,
    to: email,
    subject: SUBJECT,
    text: renderTpl(BODY_TEXT, code),
    html: renderTpl(BODY_HTML, code),
  });
  return info.messageId;
}

async function sendViaResend(email, code) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: SUBJECT,
      text: renderTpl(BODY_TEXT, code),
      html: renderTpl(BODY_HTML, code),
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Resend API ' + res.status + ': ' + txt.slice(0, 200));
  }
  const data = await res.json().catch(() => ({}));
  return data.id || 'unknown';
}

async function withCooldown(email, fn) {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const last = _lastSent.get(key) || 0;
  if (now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    const err = new Error('retry-after ' + retryAfter + 's');
    err.retryAfter = retryAfter;
    err.name = 'CooldownError';
    throw err;
  }
  const result = await fn();
  _lastSent.set(key, Date.now());
  if (_lastSent.size > 1000) {
    const cutoff = Date.now() - COOLDOWN_MS * 2;
    for (const [k, v] of _lastSent) {
      if (v < cutoff) _lastSent.delete(k);
    }
  }
  return result;
}

/**
 * 对外主入口
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{code: string|null, devOnly: boolean, messageId?: string}>}
 */
export async function sendVerifyCode(email, code) {
  if (!IS_PROD) {
    return withCooldown(email, async () => {
      console.log('[mailer:dev] verify code ' + email + ' -> ' + code);
      return { code, devOnly: true };
    });
  }
  const { t, kind } = await getTransport();
  return withCooldown(email, async () => {
    try {
      const messageId =
        kind === 'smtp' ? await sendViaSmtp(t, email, code) :
        kind === 'resend' ? await sendViaResend(email, code) :
        Promise.reject(new Error('unsupported provider: ' + kind));
      console.log('[mailer:prod] email sent to ' + email + ' via ' + kind + '; id=' + (messageId || '?'));
      return { code: null, devOnly: false, messageId };
    } catch (err) {
      console.error('[mailer:prod] send failed (' + kind + '):', err.message || err);
      throw err;
    }
  });
}

/**
 * 邮件通道自检
 * @returns {Promise<{kind: string, ok: boolean, error?: string}>}
 */
export async function smtpProbe() {
  if (!IS_PROD) return { kind: 'dev', ok: true };
  const { t, kind } = await getTransport();
  try {
    if (kind === 'smtp') await t.verify();
    return { kind, ok: true };
  } catch (err) {
    return { kind, ok: false, error: err.message || String(err) };
  }
}
