/**
 * 账号鉴权状态管理。
 *
 * - 状态：token + me（用户资料）
 * - 持久化：token 存 localStorage key=copycraft_session_token
 * - 启动时若有 token，自动 try 调 /api/account/me 刷新 me；401 → 清 token（静默）
 * - 任何 401 自动 logout（除了 account/me 自身startup）
 * - 对外暴露 fetchWithAuth：带 Authorization: Bearer；401 时自动登出
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@/api/auth';
import * as authApi from '@/api/auth';

const LS_TOKEN_KEY = 'copycraft_session_token';

export type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  token: string | null;
  me: User | null;
  status: AuthStatus;
  /** 登录成功：触发 startup 同步 */
  login: (token: string, user: User) => void;
  /** 登出：清状态 + localStorage */
  logout: () => void;
  /** 手动刷新 me（如服务端设置被改） */
  refreshMe: () => Promise<void>;
  /** 带 token 的请求工具 */
  fetchWithAuth: (input: string, init?: RequestInit) => Promise<Response>;
  /** 更新本地 me 部分字段（如 hasApiKey） */
  patchMe: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_TOKEN_KEY) || null; } catch { return null; }
  });
  const [me, setMe] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (token ? 'loading' : 'guest'));

  // startup: token 存在时尝试刷新
  const didStartup = useRef(false);
  useEffect(() => {
    if (didStartup.current) return;
    didStartup.current = true;
    if (!token) {
      setStatus('guest');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await authApi.getMe(token);
        if (cancelled) return;
        setMe(u);
        setStatus('authed');
      } catch {
        if (cancelled) return;
        // 静默清 token
        try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
        setToken(null);
        setMe(null);
        setStatus('guest');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const login = (newToken: string, user: User) => {
    try { localStorage.setItem(LS_TOKEN_KEY, newToken); } catch {}
    setToken(newToken);
    setMe(user);
    setStatus('authed');
  };

  const logout = async () => {
    const t = token;
    try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
    setToken(null);
    setMe(null);
    setStatus('guest');
    if (t) {
      try { await authApi.logout(t); } catch { /* 静默 */ }
    }
  };

  const patchMe = (p: Partial<User>) => setMe((m) => (m ? { ...m, ...p } : m));

  const refreshMe = async () => {
    if (!token) return;
    const u = await authApi.getMe(token);
    setMe(u);
  };

  const fetchWithAuth = async (input: string, init: RequestInit = {}): Promise<Response> => {
    if (!token) throw new Error('未登录');
    const headers = new Headers(init.headers);
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
      // 401 → 自动 logout；这里不 await，避免阻塞
      try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
      setToken(null);
      setMe(null);
      setStatus('guest');
    }
    return res;
  };

  const value = useMemo<AuthContextValue>(() => ({
    token,
    me,
    status,
    login,
    logout,
    fetchWithAuth,
    refreshMe,
    patchMe,
  }), [token, me, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}
