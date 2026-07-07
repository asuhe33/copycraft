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
    createdAt: u.created_at,
  };
}

router.get('/me', (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });
  return res.json({ ok: true, user: publicRow(user) });
});

router.delete('/', (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });
  db.deleteSessionsByUserId(req.userId);
  db.deleteUserCascade(req.userId);
  console.log(`[account] 用户已删库 ${user.email} (${req.userId})`);
  return res.json({ ok: true });
});

export default router;
