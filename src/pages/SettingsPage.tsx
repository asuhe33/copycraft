import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Toggle } from '@/components/atoms/Toggle';
import { Spinner } from '@/components/atoms/Spinner';
import { useAppContext } from '@/context';
import { maskApiKey, loadFromStorage, saveToStorage } from '@/utils/crypto';
import { validateKey } from '@/api/deepseek';

const STORAGE_KEY = 'copycraft_api_key';

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

          <section className="pt-6 border-t border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>ℹ️</span> 关于 CopyCraft
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>CopyCraft · 文案魔匠 v0.1.0</p>
              <p>当前接入模型：DeepSeek（deepseek-chat）</p>
              <p>当前适配平台：小红书种草笔记</p>
              <p>数据存储：本地 localStorage</p>
              <p className="text-xs pt-2">Vibe Coding · MVP 阶段 · 请勿输入 PII 内容</p>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
