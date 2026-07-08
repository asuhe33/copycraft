/**
 * CopyCraft 后端 (ESM + MySQL)
 *
 * 启动：npm run server  （已无需 --experimental-sqlite）
 * 首次：DB_INIT_BEFORE_BOOT=1 npm run server   或   npm run db:init
 *
 * 环境变量：
 *   PORT / JWT_SECRET(必填) / DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 *   VERIFY_CODE_TTL / SESSION_TTL / DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DB_INIT_BEFORE_BOOT
 *   邮件（PROD，opt-in）：EMAIL_SMTP_URI | (EMAIL_PROVIDER=resend + RESEND_API_KEY) / MAIL_FROM / EMAIL_COOLDOWN_MS
 */
import express from 'express';
import cors from 'cors';

if (!process.env.JWT_SECRET) {
  console.error('\n[CopyCraft] 致命错误：环境变量 JWT_SECRET 未设置。');
  console.exit(1);
}

import * as db from './db.js';
import { authenticate } from './middleware.js';
import { aesDecrypt } from './crypto.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import accountRoutes from './routes/account.js';

const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
// 强制 https：杜绝 SSRF 到内网 http 网关（环境变量不可信模型下的防御）
const RAW_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_BASE_URL = RAW_BASE.startsWith('https://') ? RAW_BASE : (() => {
  console.warn(`[CopyCraft] DEEPSEEK_BASE_URL 必须以 https:// 开头，已强制改为默认 https://api.deepseek.com/v1`);
  return 'https://api.deepseek.com/v1';
})();

async function maybeBootstrap() {
  if (process.env.DB_INIT_BEFORE_BOOT !== '1') return;
  const { execFileSync } = await import('node:child_process');
  const path = await import('node:path');
  try {
    execFileSync(process.execPath, [path.join(process.cwd(), 'server/db_init.js')], { stdio: 'inherit' });
  } catch (e) {
    console.error('[CopyCraft] db_init 失败：', e.message || e);
    process.exit(1);
  }
}

// CORS 白名单：默认仅允许 localhost（前端 dev server / Tauri WebView / PWA 同域）。
// 公网部署时设 CORS_ORIGIN=https://your-domain.com （逗号分隔多个）
const CORS_RAW = process.env.CORS_ORIGIN || '';
const CORS_LIST = CORS_RAW
  ? CORS_RAW.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3001', 'tauri://localhost'];

const app = express();
app.use(cors({
  origin: function (origin, cb) {
    // 允许无 origin 的请求（桌面端 Tauri WebView、curl、PWA 同域）
    if (!origin) return cb(null, true);
    if (CORS_LIST.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy: origin ' + origin + ' not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  let dbState = 'ok';
  try { await db.warmup(); await db.purgeExpiredSessions(); }
  catch (e) { dbState = 'error: ' + (e.message || e); }
  res.json({
    status: 'ok',
    service: 'copycraft-backend',
    time: new Date().toISOString(),
    deepseek: DEEPSEEK_API_KEY ? 'configured' : 'not-configured',
    db: dbState,
    sync: true,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/sync', authenticate, syncRoutes);
app.use('/api/account', authenticate, accountRoutes);

app.post('/api/generate', async (req, res) => {
  let effectiveKey = DEEPSEEK_API_KEY;
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const session = await db.findSession(m[1].trim());
    if (session && session.expires_at > Date.now()) {
      const user = await db.findUserById(session.user_id);
      if (user && user.api_key_enc) {
        const dec = aesDecrypt(user.api_key_enc);
        if (dec) effectiveKey = dec;
      }
    }
  }
  if (!effectiveKey) {
    return res.status(503).json({
      error: { message: '后端未配置 DEEPSEEK_API_KEY，请在「设置」页配置 Key' },
    });
  }

  const { messages, model, temperature, stream } = req.body || {};
  try {
    const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${effectiveKey}` },
      body: JSON.stringify({ model: model || 'deepseek-chat', messages, temperature: temperature ?? 0.7, stream: !!stream }),
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
      } catch { /* client disconnect */ } finally { res.end(); }
      return;
    }
    const data = await upstream.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: { message: `代理失败: ${e.message}` } });
  }
});

setInterval(() => {
  db.purgeExpiredSessions().catch(() => {});
}, 5 * 60 * 1000).unref?.();

maybeBootstrap()
  .then(() => db.warmup())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n[CopyCraft] 后端已启动: http://localhost:${PORT}`);
      console.log(`[CopyCraft] DB: ${process.env.DB_USER || 'root'}@${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'copycraft'}`);
      console.log(`[CopyCraft] health: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch((e) => {
    console.error('\n[CopyCraft] 启动失败:', e.message || e);
    process.exit(1);
  });
