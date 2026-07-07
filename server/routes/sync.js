/**
 * /api/sync/*  (ESM)
 */
import express from 'express';
import * as db from '../db.js';
import { aesEncrypt, aesDecrypt } from '../crypto.js';

const router = express.Router();

const VALID_PLATFORMS = ['xiaohongshu', 'weibo', 'douyin', 'gongzhonghao'];

function sanitizeHistoryItem(it) {
  if (!it || typeof it !== 'object') return null;
  const id = String(it.id || '').trim();
  if (!id) return null;
  const content = String(it.content || '');
  const platform = String(it.platform || 'xiaohongshu');
  if (!VALID_PLATFORMS.includes(platform)) return null;
  const createdAt = Number(it.createdAt) || 0;
  let updatedAt = Number(it.updatedAt);
  if (!updatedAt || !Number.isFinite(updatedAt)) updatedAt = createdAt;
  return { id, content, platform, createdAt, updatedAt, deleted: it.deleted ? 1 : 0 };
}

function toClient(row) {
  return {
    id: row.id,
    content: row.content,
    platform: row.platform,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deleted: !!row.deleted,
  };
}

router.post('/history', (req, res) => {
  const userId = req.userId;
  const { items: rawItems, lastSyncAt: rawLast } = req.body || {};
  const lastSyncAt = rawLast === null || rawLast === undefined ? null : Number(rawLast);
  const clean = (Array.isArray(rawItems) ? rawItems : []).map(sanitizeHistoryItem).filter(Boolean);
  const pushed = clean.length ? db.upsertHistory(userId, clean) : 0;
  const rows = db.listHistorySince(userId, lastSyncAt);
  const serverAt = Date.now();
  if (pushed > 0) console.log(`[sync:history] user=${userId} pushed=${pushed} pulled=${rows.length}`);
  return res.json({ ok: true, items: rows.map(toClient), serverAt, pushed });
});

router.post('/settings', (req, res) => {
  const userId = req.userId;
  const now = Date.now();
  const { updatedAt: clientTs, apikeyEnc, toneStyle, maxLength, temperature } = req.body || {};
  const user = db.findUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });

  const clientUpdated = Number(clientTs) || 0;
  const serverUpdated = user.updated_at;
  let accepted = false;
  let apiKeyStored;

  if (clientUpdated >= serverUpdated) {
    if (typeof apikeyEnc === 'string' && apikeyEnc) {
      const plain = String(apikeyEnc);
      const alreadyWrapped = /^[0-9a-f]{24,}:[0-9a-f]{24,}:[A-Za-z0-9+/=]+$/.test(plain);
      apiKeyStored = alreadyWrapped ? plain : aesEncrypt(plain);
    }
    const patch = { updatedAt: clientUpdated || now };
    if (typeof toneStyle === 'string' && toneStyle) patch.toneStyle = toneStyle;
    if (Number.isFinite(maxLength) && maxLength > 0) patch.maxLength = Math.min(5000, Math.max(50, Math.round(maxLength)));
    if (Number.isFinite(temperature) && temperature >= 0 && temperature <= 2) patch.temperature = temperature;
    if (apiKeyStored !== undefined) patch.apiKeyEnc = apiKeyStored;
    db.updateUserSettings(userId, patch);
    accepted = true;
  }

  const fresh = db.findUserById(userId);
  const settings = {
    toneStyle: fresh.tone_style,
    maxLength: fresh.max_length,
    temperature: fresh.temperature,
    apikeyPlain: (accepted && typeof apikeyEnc === 'string' && apikeyEnc)
      ? safeDecrypt(fresh.api_key_enc)
      : null,
    hasApiKey: !!fresh.api_key_enc,
    updatedAt: fresh.updated_at,
  };
  return res.json({ ok: true, accepted, settings, serverAt: now });
});

function safeDecrypt(enc) {
  try { return aesDecrypt(enc); } catch { return null; }
}

export default router;
