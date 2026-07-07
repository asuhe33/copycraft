/**
 * /api/account/*  (ESM)
 */
import express from 'express';
import * as db from '../db.js';

const router = express.Router();

function publicRow(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    toneStyle: u.tone_style,
    maxLength: u.max_length,
    temperature: u.temperature,
    hasApiKey: !!u.api_key_enc,
    createdAt: Number(u.created_at),
  };
}

router.get('/me', async (req, res) => {
  const user = await db.findUserById(req.userId);
  if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });
  return res.json({ ok: true, user: publicRow(user) });
});

router.delete('/', async (req, res) => {
  const user = await db.findUserById(req.userId);
  if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });
  await db.deleteSessionsByUserId(req.userId);
  await db.deleteUserCascade(req.userId);
  console.log(`[account] 用户已删库 ${user.email} (${req.userId})`);
  return res.json({ ok: true });
});

export default router;
