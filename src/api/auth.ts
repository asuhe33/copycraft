/**
 * 账号鉴权 API。
 *
 * 后端约定见 server/routes/auth.js。MVP 阶段验证码在下发时直接返给客户端（devOnly），
 * 前端弹层展示让用户"抄验证码"——免去接真实邮件通道。
 */

export interface User {
  id: string;
  email: string;
  toneStyle: string;
  maxLength: number;
  temperature: number;
  hasApiKey: boolean;
  createdAt: number;
}

export interface AuthResult {
  ok: boolean;
  token: string;
  user: User;
  deviceId: string;
}

const BASE = '/api/auth';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function parseError(body: any): string {
  if (!body) return '请求失败';
  if (typeof body === 'string') return body;
  return body.error || body.message || '请求失败';
}

async function asJson(res: Response) {
  let body: any = null;
  try { body = await res.json(); } catch { /* 非 json */ }
  if (!res.ok) throw new ApiError(res.status, parseError(body));
  return body;
}

export type AuthMode = 'register' | 'login';

export async function requestCode(email: string, mode: AuthMode): Promise<{
  ok: boolean;
  devOnly: boolean;
  code?: string;
  expiresAt: number;
}> {
  const r = await fetch(`${BASE}/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mode }),
  });
  return asJson(r);
}

export async function verifyCode(
  email: string,
  code: string,
  password: string,
  mode: AuthMode,
  deviceName?: string,
): Promise<AuthResult> {
  const r = await fetch(`${BASE}/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password, mode, deviceName }),
  });
  return asJson(r);
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export async function getMe(token: string): Promise<User> {
  const r = await fetch('/api/account/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await asJson(r);
  return j.user as User;
}

export async function deleteAccount(token: string): Promise<void> {
  const r = await fetch('/api/account/', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await asJson(r);
}

export { ApiError };
