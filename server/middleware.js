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

  const session = db.findSession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'session 已吊销' });
  if (session.expires_at < Date.now()) {
    db.deleteSession(token);
    return res.status(401).json({ ok: false, error: 'session 已过期' });
  }
  req.userId = session.user_id;
  req.sessionToken = token;
  next();
}
