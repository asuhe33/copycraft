/**
 * 鉴权中间件（ESM）：从 Authorization: Bearer <token> 解析 session，注入 req.userId。
 */
import * as db from './db.js';
import { verifyToken } from './crypto.js';

export function authenticate(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ ok: false, error: '未登录或 token 缺失' });

  const token = match[1].trim();
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok: false, error: 'token 无效或已过期' });

  // DB 查 session 是异步；用 async 包装。express 5 支持 async route handler，但这里用 .then 以防 express 4。
  db.findSession(token).then((session) => {
    if (!session) return res.status(401).json({ ok: false, error: 'session 已吊销' });
    if (session.expires_at < Date.now()) {
      return db.deleteSession(token).then(() => res.status(401).json({ ok: false, error: 'session 已过期' }));
    }
    req.userId = session.user_id;
    req.sessionToken = token;
    next();
  }).catch((e) => {
    console.error('[authenticate] DB 错误:', e);
    return res.status(500).json({ ok: false, error: '鉴权服务错误' });
  });
}
