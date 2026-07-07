/**
 * 登录/注册表单一件事：
 *   第 1 步：邮箱 + 选模式（register/login）→ request-code
 *   第 2 步：验证码 6 位 + 密码（注册强制 >=6 位）→ verify-code → 拿 token
 *
 * MVP 分支：后端 devOnly=true 直接把验证码返到前端，这里弹通知让用户"抄"过去，
 * 免去真实邮件通道。组件签名上给 onDevCode 方便父级弹 toast / alert。
 */

import { useState } from 'react';
import type { AuthMode } from '@/api/auth';
import { requestCode, verifyCode } from '@/api/auth';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useAuth } from '@/auth/AuthContext';

interface Props {
  /** 成功登录后回调 */
  onSuccess?: () => void;
}

type Step = 'email' | 'codePw';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ onSuccess }: Props) {
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<AuthMode>('register');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [badge, setBadge] = useState<string>('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const finishLogin = (token: string, user: Parameters<typeof login>[1]) => {
    login(token, user);
    onSuccess?.();
  };

  const submitEmail = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setBadge('邮箱格式不正确');
      setStatus('error');
      return;
    }
    setStatus('busy');
    setBadge(`${mode === 'register' ? '注册' : '登录'}验证码正在下发…`);
    setDevCode(null);
    try {
      const r = await requestCode(e, mode);
      if (!r.ok) {
        setBadge(r.devOnly ? '请求失败' : (r as any).error || '请求失败');
        setStatus('error');
        return;
      }
      setStep('codePw');
      if ((r as any).devOnly && (r as any).code) {
        // DEV：直接返
        setDevCode((r as any).code);
        setBadge(`【DEV 模式】验证码：${(r as any).code}`);
      } else {
        setBadge('验证码已下发到邮箱，5 分钟内有效');
      }
      setStatus('idle');
    } catch (err) {
      setBadge((err as Error).message || '网络错误');
      setStatus('error');
    }
  };

  const submitVerify = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(code)) {
      setBadge('验证码应为 6 位数字');
      setStatus('error');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setBadge('密码至少 6 位');
      setStatus('error');
      return;
    }
    setStatus('busy');
    setBadge('正在核销…');
    try {
      const r = await verifyCode(e, code, password, mode, navigator?.userAgent?.slice(0, 80));
      finishLogin(r.token, r.user);
    } catch (err) {
      setBadge((err as Error).message || '核销失败');
      setStatus('error');
    }
  };

  const reset = () => {
    setStep('email');
    setCode('');
    setPassword('');
    setDevCode(null);
    setBadge('');
    setStatus('idle');
  };

  return (
    <div className="space-y-3">
      {step === 'email' && (
        <>
          <div className="flex gap-2">
            {(['register', 'login'] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-brand-300'
                }`}
              >
                {m === 'register' ? '创建账号' : '登录已有'}
              </button>
            ))}
          </div>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setBadge(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEmail();
            }}
            error={status === 'error' && badge ? badge : undefined}
          />
          <Button onClick={submitEmail} loading={status === 'busy'} block>
            获取验证码
          </Button>
        </>
      )}

      {step === 'codePw' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {email}{' '}
              <button type="button" className="text-brand-600 underline" onClick={reset}>
                换邮箱
              </button>
            </p>
            <button
              type="button"
              className="text-xs text-brand-600 underline"
              onClick={async () => {
                try {
                  const r = await requestCode(email.trim().toLowerCase(), mode);
                  if ((r as any).devOnly && (r as any).code) {
                    setDevCode((r as any).code);
                    setBadge(`【DEV】新验证码：${(r as any).code}`);
                  } else {
                    setBadge('已重新下发');
                  }
                } catch (err) {
                  setBadge((err as Error).message || '重发失败');
                }
              }}
            >
              重发
            </button>
          </div>

          {devCode && (
            <div
              className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2 cursor-pointer"
              onClick={() => { navigator.clipboard?.writeText(devCode).catch(() => {}); setBadge('已复制验证码'); }}
              title="点击复制"
            >
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-medium mb-0.5">dev 模式</p>
                <p>
                  验证码：<strong className="font-mono text-base">{devCode}</strong>
                  <span className="ml-2 opacity-70">(点击复制)</span>
                </p>
              </div>
            </div>
          )}

          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 位验证码"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setStatus('idle');
              setBadge('');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitVerify(); }}
          />
          <Input
            type="password"
            placeholder={mode === 'register' ? '设置密码（≥6 位）' : '登录密码'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setStatus('idle'); setBadge(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitVerify(); }}
            error={status === 'error' && badge ? badge : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          <Button onClick={submitVerify} loading={status === 'busy'} block>
            {mode === 'register' ? '创建账号并登录' : '登录'}
          </Button>
        </>
      )}

      {status === 'busy' && badge && (
        <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Spinner size="sm" /> {badge}
        </p>
      )}
    </div>
  );
}
