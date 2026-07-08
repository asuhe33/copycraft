import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Toggle } from '@/components/atoms/Toggle';
import { Spinner } from '@/components/atoms/Spinner';
import { useAppContext } from '@/context';
import { useAuth } from '@/auth/AuthContext';
import { useHistory } from '@/hooks/useHistory';
import { useSync } from '@/hooks/useSync';
import { maskApiKey, loadFromStorage, saveToStorage } from '@/utils/crypto';
import { validateKey } from '@/api/deepseek';
import { deleteAccount } from '@/api/auth';
import { LoginForm } from '@/components/business/auth/LoginForm';
import { IS_DESKTOP } from '@/constants/routes';

const STORAGE_KEY = 'copycraft_api_key';
const LS_SETTINGS_UPDATED_AT = 'copycraft_settings_updated_at';

type ValidateStatus = 'idle' | 'validating' | 'ok' | 'fail';

export function SettingsPage() {
  const { state, dispatch } = useAppContext();
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(state.key.value);
  const [status, setStatus] = useState<ValidateStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // 初始化：从 localStorage 恢复
  if (!state.key.value && !state.key.masked) {
    const saved = loadFromStorage<string>(STORAGE_KEY, '');
    if (saved) {
      dispatch({
        type: 'KEY_SET',
        payload: { value: saved, masked: maskApiKey(saved) },
      });
      setInputValue(saved);
    }
  }

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setStatus('fail');
      setStatusMessage('请输入 API Key');
      dispatch({ type: 'KEY_SET_VALID', payload: false });
      return;
    }

    setStatus('validating');
    setStatusMessage('正在校验…');
    dispatch({ type: 'KEY_SET_VALIDATING', payload: true });

    const result = await validateKey(trimmed);

    dispatch({ type: 'KEY_SET_VALIDATING', payload: false });
    if (result.ok) {
      saveToStorage(STORAGE_KEY, trimmed);
      dispatch({
        type: 'KEY_SET',
        payload: { value: trimmed, masked: maskApiKey(trimmed) },
      });
      dispatch({ type: 'KEY_SET_VALID', payload: true });
      setStatus('ok');
      setStatusMessage(result.message);
    } else {
      dispatch({ type: 'KEY_SET_VALID', payload: false });
      setStatus('fail');
      setStatusMessage(result.message);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'KEY_CLEAR' });
    setInputValue('');
    setStatus('idle');
    setStatusMessage('');
    setShowKey(false);
  };

  const statusBadge = (() => {
    if (status === 'validating') return <Spinner size="sm" text="校验中…" />;
    if (status === 'ok') return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">✓ 校验通过</span>;
    if (status === 'fail') return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">✗ {statusMessage}</span>;
    if (state.key.masked) return <span className="text-xs text-gray-500 dark:text-gray-400">已保存：{state.key.masked}</span>;
    return null;
  })();

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">设置</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">管理你的 API 密钥与生成偏好</p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🔑</span> DeepSeek API 密钥
            </h2>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 mb-4">
              <p className="font-medium mb-1">🔐 密钥说明</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>仅保存在你浏览器的 localStorage 中，不会上传任何第三方。</li>
                <li>去 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="underline">platform.deepseek.com</a> 申请免费的 API Key。</li>
                <li>仅支持 <code className="bg-blue-200/50 dark:bg-blue-900/50 px-1 rounded">deepseek-chat</code> 模型。</li>
              </ul>
            </div>

            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setStatus('idle');
                setStatusMessage('');
              }}
              error={status === 'fail' && !statusMessage.startsWith('正在') ? statusMessage : undefined}
            />

            <div className="flex items-center justify-between gap-4 mt-3">
              <Toggle
                id="toggle-show-key"
                label={showKey ? '隐藏 Key' : '显示 Key'}
                checked={showKey}
                onChange={setShowKey}
              />
              <div>{statusBadge}</div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} loading={status === 'validating'} block>
                {state.key.masked ? '保存并重新校验' : '保存并校验'}
              </Button>
              <Button variant="secondary" onClick={handleClear} disabled={!inputValue && !state.key.masked}>
                清除
              </Button>
            </div>
          </section>

          {/* ---------- 账户与同步（桌面单机版屏蔽） ---------- */}
          {!IS_DESKTOP && (
            <section className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>☁️</span> 账户与同步
              </h2>
              <AccountSync />
            </section>
          )}

          <section className="pt-6 border-t border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>ℹ️</span> 关于 CopyCraft
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>CopyCraft · 文案魔匠 v0.1.0</p>
              <p>当前接入模型：DeepSeek（deepseek-chat）</p>
              <p>当前适配平台：微博 / 抖音 / 公众号 / 小红书</p>
              <p>数据存储：本地 localStorage{IS_DESKTOP ? '（桌面单机版）' : '（可同步到云端）'}</p>
              <p className="text-xs pt-2">Vibe Coding · MVP 阶段 · 请勿输入 PII 内容</p>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}

/** 账户与同步子组件（需要 AuthContext + useSync） */
function AccountSync() {
  const { me, status: authStatus, login, logout } = useAuth();
  const { state, dispatch } = useAppContext();
  const history = useHistory();

  const authed = authStatus === 'authed' && !!me;

  // 同步状态/错误
  const [now, setNow] = useState(Date.now());
  // 每次强制刷新展示时间戳（仅已登录时触发）
  // 用户点"托管到云端"后，触发一次强制同步（带 key）
  const [shouldPushKey, setShouldPushKey] = useState(false);

  const { status: syncStatus, error: syncError, forceSync } = useSync({
    localHistory: history.items,
    setAllHistory: history.replaceAll,
    localSettings: {
      toneStyle: state.config.toneStyle,
      maxLength: state.config.maxLength,
      temperature: state.config.temperature,
    },
    applyServerSettings: (s) => {
      dispatch({ type: 'SET_CONFIG', payload: s });
    },
    // 当用户显式点"托管"时，把本地明文 key 推给服务端加密存储
    getApikeyToPush: shouldPushKey ? () => state.key.value : undefined,
  });

  /** 首次登录自动触发已在 useSync 内部 one-shot effect 处理；这里只做托管按钮触发。 */
  useEffect(() => {
    if (shouldPushKey) {
      setShouldPushKey(false);
      forceSync();
    }
  }, [shouldPushKey, forceSync]);

  // now/setNow 故意未用：已被移除 void

  // ── 未登录：展示注册表单 ──
  if (!authed) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">☁️ 登录以启用跨设备同步</p>
          <ul className="space-y-0.5 list-disc pl-4">
            <li>历史文案换手机不丢</li>
            <li>API Key 加密托管</li>
            <li>说话风格偏好自动同步</li>
          </ul>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            MVP 阶段验证码直接显示在页面（dev 模式）。
          </p>
        </div>
        <LoginForm onSuccess={() => setNow(Date.now())} />
      </div>
    );
  }

  // ── 已登录：展示账户状态 + 同步控制 ──
  const lastLabel = (() => {
    if (syncStatus === 'syncing') return '同步中…';
    if (syncStatus === 'error') return `同步失败：${syncError || '请检查后端是否启动 (npm run server)'}`;
    return '已开启自动同步';
  })();

  const dotClass = syncStatus === 'syncing'
    ? 'bg-blue-500'
    : syncStatus === 'error'
      ? 'bg-amber-500'
      : 'bg-green-500';

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    const yes = window.confirm('⚠️ 删除账户将彻底清空云端历史、托管的 API Key、偏好，且不可恢复。确定？');
    if (!yes) return;
    const pwd = window.prompt('请输入登录密码确认：');
    if (!pwd) return;
    try {
      // 读 token（AuthContext 持久化的同一份）
      const k = localStorage.getItem('copycraft_session_token');
      if (!k) { alert('请先重新登录再删库'); return; }
      await deleteAccount(k);
      await logout();
      alert('账号已清除。');
    } catch (e) {
      alert(`删库失败：${(e as Error).message}`);
    }
  };

  /** 把本地 API Key（托管到服务端）：立刻推一次 settings */
  const pushKeyToCloud = () => {
    if (!state.key.value) return;
    setShouldPushKey(true);
  };

  const syncStatusIcon = syncStatus === 'syncing'
    ? <Spinner size="sm" />
    : <span className={`inline-block h-2 w-2 rounded-full ${dotClass} flex-shrink-0`} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {me!.email}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {syncStatusIcon}
            <span>{lastLabel}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={forceSync}
            disabled={syncStatus === 'syncing'}
            className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            立即同步
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            登出
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-300">
            云端托管的 API Key：{me!.hasApiKey ? '已保存（加密）' : '未保存'}
          </span>
          <button
            type="button"
            onClick={pushKeyToCloud}
            disabled={!state.key.value || syncStatus === 'syncing'}
            className="text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            {me!.hasApiKey ? '重新托管' : '托管到云端'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          API Key 经 AES-256-GCM 加密后存于服务端，换设备登录可恢复。同一 session 内写回时可拿到明文。
        </p>
      </div>

      <button
        type="button"
        onClick={handleDeleteAccount}
        className="text-xs text-red-500 hover:text-red-600 underline"
      >
        删除我的账号与所有云端数据
      </button>
    </div>
  );
}
