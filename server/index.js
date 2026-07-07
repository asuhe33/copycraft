/**
 * CopyCraft 轻量后端  (ESM)
 *
 * 启动：npm run server（package.json 已加 --experimental-sqlite）
 *
 * 环境变量：
 *   PORT             默认 3001
 *   JWT_SECRET       必填（HMAC + AES 派生根）
 *   DEEPSEEK_API_KEY 可选；未配置时 fallback 用户托管的 Key
 *   DEEPSEEK_BASE_URL 默认 https://api.deepseek.com/v1
 *   DB_PATH          默认 server/data/copycraft.db
 *   VERIFY_CODE_TTL  验证码有效期（秒），默认 600
 *   SESSION_TTL      session 有效期（秒），默认 30 天
 *  SMTP_HOST        存在即走 PROD 邮件模式
 */
import express from 'express';
import cors from 'cors';

if (!process.env.JWT_SECRET) {
  console.error('\n[CopyCraft] 致命错误：环境变量 JWT_SECRET 未设置。');
  console.error('            示例：  JWT_SECRET=please-set-me npm run server\n');
  process.exit(1);
}

import * as db from './db.js';
import { authenticate } from './middleware.js';
import { aesDecrypt } from './crypto.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import accountRoutes from './routes/account.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
  let dbOk = true;
  try { db.purgeExpiredSessions(); } catch { dbOk = false; }
  res.json({
    status: 'ok',
    service: 'copycraft-backend',
    time: new Date().toISOString(),
    deepseek: DEEPSEEK_API_KEY ? 'configured' : 'not-configured',
    db: dbOk ? 'ok' : 'error',
    sync: true,
  });
});

// ---------- 鉴权 / 同步 / 账户 ----------
app.use('/api/auth', authRoutes);
app.use('/api/sync', authenticate, syncRoutes);
app.use('/api/account', authenticate, accountRoutes);

// ---------- DeepSeek 代理 ----------
app.post('/api/generate', async (req, res) => {
  let effectiveKey = DEEPSEEK_API_KEY;
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const session = db.findSession(m[1].trim());
    if (session && session.expires_at > Date.now()) {
      const user = db.findUserById(session.user_id);
      if (user && user.api_key_enc) {
        const decrypted = aesDecrypt(user.api_key_enc);
        if (decrypted) effectiveKey = decrypted;
      }
    }
  }
  if (!effectiveKey) {
    return res.status(503).json({
      error: { message: '后端未配置 DEEPSEEK_API_KEY，请在「设置」页配置 Key 或在账户中托管' },
    });
  }

  const { messages, model, temperature, stream } = req.body || {};
  try {
    const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${effectiveKey}` },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: temperature ?? 0.7,
        stream: !!stream,
      }),
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: { message: errText } });
    }
    if (stream && upstream.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch {
        // 客户端断开
      } finally {
        res.end();
      }
      return;
    }
    const data = await upstream.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: { message: `代理失败: ${e.message}` } });
  }
});

setInterval(() => {
  try { db.purgeExpiredSessions(); } catch {}
}, 5 * 60 * 1000).unref?.();

app.listen(PORT, () => {
  console.log(`\n[CopyCraft] 后端已启动:  http://localhost:${PORT}`);
  console.log(`[CopyCraft] DeepSeek:   ${DEEPSEEK_API_KEY ? '环境变量已配置' : '未配置（优先用户托管 Key）'}`);
  console.log(`[CopyCraft] 健康检查:   http://localhost:${PORT}/api/health`);
  console.log(`[CopyCraft] 云同步:     已启用（db: ${process.env.DB_PATH || 'server/data/copycraft.db'}）`);
  console.log('');
});
