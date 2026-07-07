import { useState, useEffect } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Toggle } from '@/components/atoms/Toggle';
import { useAppContext } from '@/context';
import { maskApiKey, loadFromStorage, saveToStorage } from '@/utils/crypto';

const STORAGE_KEY = 'copycraft_api_key';

export function KeyManager() {
  const { state, dispatch } = useAppContext();
  const [showKey, setShowKey] = useState(false);

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    const saved = loadFromStorage<string>(STORAGE_KEY, '');
    if (saved) {
      dispatch({
        type: 'KEY_SET',
        payload: { value: saved, masked: maskApiKey(saved) },
      });
      dispatch({ type: 'KEY_SET_VALID', payload: null });
    }
    // 仅首次加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const value = state.key.value.trim();
    if (!value) {
      dispatch({ type: 'KEY_SET_VALID', payload: false });
      return;
    }
    saveToStorage(STORAGE_KEY, value);
    dispatch({
      type: 'KEY_SET',
      payload: { value, masked: maskApiKey(value) },
    });
    dispatch({ type: 'KEY_SET_VALID', payload: true });
    // 3 秒后清除成功提示
    setTimeout(() => dispatch({ type: 'KEY_SET_VALID', payload: null }), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'KEY_CLEAR' });
    setShowKey(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">🔐 关于密钥安全</p>
        <p>API Key 仅保存在你浏览器的 localStorage 中，不会上传到任何服务器。请妥善保管你的 Key。</p>
      </div>

      <Input
        label="DeepSeek API Key"
        type={showKey ? 'text' : 'password'}
        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
        value={state.key.value}
        onChange={(e) => dispatch({ type: 'KEY_SET', payload: { value: e.target.value, masked: '' } })}
        error={state.key.isValid === false ? '请输入有效的 API Key' : undefined}
        hint={state.key.masked && !state.key.value.startsWith('sk-') ? `已保存：${state.key.masked}` : undefined}
      />

      <div className="flex items-center gap-2">
        <Toggle
          id="toggle-show-key"
          label={showKey ? '隐藏 Key' : '显示 Key'}
          checked={showKey}
          onChange={setShowKey}
        />
        {state.key.isValid === true && (
          <span className="text-xs text-green-600 dark:text-green-400">✓ 保存成功</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} block>
          保存并校验
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={!state.key.value && !state.key.masked}>
          清除
        </Button>
      </div>
    </div>
  );
}
