/**
 * /api/auth/*  (ESM)
 */
import express from 'express';
import crypto from 'node:crypto';
import * as db from '../db.js';
import {
  VERIFY_CODE_TTL,
  hashPassword,
  verifyPassword,
  newSessionToken,
  generateVerifyCode,
} from '../crypto.js';
import { sendVerifyCode } from '../mailer.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VERIFY_FAILURES = 5;

function publicUserRow(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    toneStyle: u.tone_style,
    maxLength: u.max_length,
    temperature: u.temperature,
    hasApiKey: !!u.api_key_enc,
    createdAt: u.created_at,
  };
}

router.post('/request-code', async (req, res) => {
  const { email: rawEmail, mode } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: '邮箱格式不正确' });
  if (mode !== 'register' && mode !== 'login') return res.status(400).json({ ok: false, error: 'mode 必须为 register 或 login' });
  const existing = await db.findUserByEmail(email);
  if (mode === 'register' && existing) return res.status(409).json({ ok: false, error: '该邮箱已注册，请直接登录' });
  if (mode === 'login' && !existing) return res.status(404).json({ ok: false, error: '该邮箱未注册' });

  const code = generateVerifyCode();
  const now = Date.now();
  await db.saveVerifyCode({ email, code, expiresAt: now + VERIFY_CODE_TTL, createdAt: now });

  const send = await sendVerifyCode(email, code);
  if (send.devOnly) {
    return res.json({ ok: true, devOnly: true, code, expiresAt: now + VERIFY_CODE_TTL });
  }
  return res.json({ ok: true, devOnly: false, expiresAt: now + VERIFY_CODE_TTL });
});

router.post('/verify-code', async (req, res) => {
  const { email: rawEmail, code, password, deviceName, mode } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: '邮箱格式不正确' });
  if (!code || !/^\d{6}$/.test(String(code))) return res.status(400).json({ ok: false, error: '验证码应为 6 位数字' });

  const vc = await db.getVerifyCode(email);
  if (!vc) return res.status(400).json({ ok: false, error: '请先获取验证码' });
  if (vc.expires_at < Date.now()) {
    await db.deleteVerifyCode(email);
    return res.status(400).json({ ok: false, error: '验证码已过期，请重新获取' });
  }
  if (vc.code !== String(code)) {
    const fails = (vc.failures || 0) + 1;
    if (fails >= MAX_VERIFY_FAILURES) {
      await db.deleteVerifyCode(email);
      return res.status(429).json({ ok: false, error: '验证码错误次数过多，请重新获取' });
    }
    await db.setVerifyFailures(email, fails);
    return res.status(400).json({ ok: false, error: `验证码错误（还可尝试 ${MAX_VERIFY_FAILURES - fails} 次）` });
  }

  const now = Date.now();
  let user = await db.findUserByEmail(email);

  if (mode === 'register') {
    if (user) return res.status(409).json({ ok: false, error: '该邮箱已注册，请直接登录' });
    if (!password || String(password).length < 6) return res.status(400).json({ ok: false, error: '密码至少 6 位' });
    const id = crypto.randomUUID();
    await db.createUser({ id, email, passwordHash: hashPassword(String(password)), createdAt: now, updatedAt: now });
    user = await db.findUserById(id);
  } else {
    if (!user) return res.status(404).json({ ok: false, error: '该邮箱未注册' });
    if (!verifyPassword(String(password || ''), user.password_hash)) {
      return res.status(400).json({ ok: false, error: '密码错误' });
    }
  }

  await db.deleteVerifyCode(email);
  const deviceId = crypto.randomUUID();
  const token = newSessionToken(user.id, deviceId);
  await db.createSession({ token, userId: user.id, deviceName: deviceName || null, createdAt: now, expiresAt: now + 30 * 24 * 3600 * 1000 });
  return res.json({ ok: true, token, user: publicUserRow(user), deviceId });
});

router.post('/logout', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match) await db.deleteSession(match[1].trim());
  return res.json({ ok: true });
});

export default router;
