import { useCallback, useRef, useState } from 'react';
import { generateStream, validateKey } from '@/api/deepseek';
import { useAppContext } from '@/context';
import type { CopyInput, GenerationConfig, CopyResult } from '@/types/copy';

interface GenerateState {
  generating: boolean;
  error: string | null;
  streamingText: string;
}

interface UseGenerateReturn extends GenerateState {
  start: () => Promise<void>;
  stop: () => void;
  validateStoredKey: () => Promise<{ ok: boolean; message: string }>;
  reset: () => void;
}

/**
 * 流式生成 Hook。
 * 将 callback 式 Deepseek API 封装为 React state，通过 useRef 突破闭包陈旧引用问题，
 * 并通过 AbortController 实现「中止」能力。
 */
export function useGenerate(): UseGenerateReturn {
  const { state, dispatch } = useAppContext();
  const [gs, setGs] = useState<GenerateState>({
    generating: false,
    error: null,
    streamingText: '',
  });
  const abortRef = useRef<AbortController | null>(null);

  // ---- 工具：重置 ----
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGs({ generating: false, error: null, streamingText: '' });
    dispatch({ type: 'RESULT_CLEAR' });
  }, [dispatch]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGs((prev) => ({ ...prev, generating: false }));
    dispatch({ type: 'RESULT_SET_GENERATING', payload: false });
  }, [dispatch]);

  // ---- 校验既有 Key ----
  const validateStoredKey = useCallback(async () => {
    const key = state.key.value;
    if (!key) return { ok: false, message: '未配置 API Key' };
    dispatch({ type: 'KEY_SET_VALIDATING', payload: true });
    const result = await validateKey(key);
    dispatch({ type: 'KEY_SET_VALID', payload: result.ok });
    dispatch({ type: 'KEY_SET_VALIDATING', payload: false });
    return result;
  }, [state.key.value, dispatch]);

  // ---- 启动生成 ----
  const start = useCallback(async () => {
    const apiKey = state.key.value;
    if (!apiKey) {
      setGs((prev) => ({ ...prev, error: '请先在「设置」页配置 DeepSeek API Key' }));
      return;
    }

    const input: CopyInput = {
      rawText: state.input.rawText.trim(),
      productName: state.input.productName?.trim() || undefined,
      targetAudience: state.input.targetAudience?.trim() || undefined,
      keywords: state.input.keywords?.trim() || undefined,
    };

    if (!input.rawText) {
      setGs((prev) => ({ ...prev, error: '请先输入原始文案' }));
      return;
    }

    // 重置上一次状态
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGs({ generating: true, error: null, streamingText: '' });
    dispatch({ type: 'RESULT_SET_ERROR', payload: null });
    dispatch({ type: 'RESULT_SET_GENERATING', payload: true });
    dispatch({ type: 'KEY_SET_VALIDATING', payload: false });

    let fullText = '';

    try {
      fullText = await generateStream({
        apiKey,
        input,
        config: state.config,
        signal: controller.signal,
        onDelta: (delta) => {
          setGs((prev) => {
            const next = prev.streamingText + delta;
            return { ...prev, streamingText: next };
          });
        },
        onDone: (done) => {
          setGs((prev) => ({ ...prev, generating: false, streamingText: '' }));
          dispatch({ type: 'RESULT_SET_GENERATING', payload: false });
          dispatch({
            type: 'RESULT_ADD',
            payload: {
              id: generateId(),
              content: done,
              platformId: state.config.platformId,
              createdAt: Date.now(),
            } satisfies CopyResult,
          });
        },
        onError: (err) => {
          setGs((prev) => ({ ...prev, generating: false, error: err.message, streamingText: '' }));
          dispatch({ type: 'RESULT_SET_GENERATING', payload: false });
          dispatch({ type: 'RESULT_SET_ERROR', payload: err.message });
          // 401 → 标记 Key 失效
          if (err.message.includes('API Key')) {
            dispatch({ type: 'KEY_SET_VALID', payload: false });
          }
        },
      });

      // 用户主动中止（onDone 没触发、但也没报错）
      if (!fullText && !controller.signal.aborted) {
        // 空输出也视为完成
        dispatch({ type: 'RESULT_SET_GENERATING', payload: false });
        setGs((prev) => ({ ...prev, generating: false }));
      }
    } catch (e) {
      const msg = (e as Error).message;
      setGs((prev) => ({ ...prev, generating: false, error: msg, streamingText: '' }));
      dispatch({ type: 'RESULT_SET_GENERATING', payload: false });
      dispatch({ type: 'RESULT_SET_ERROR', payload: msg });
    } finally {
      // only clear ref if we were the current generation
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [state.key.value, state.input, state.config, dispatch]);

  return {
    generating: gs.generating,
    error: gs.error,
    streamingText: gs.streamingText,
    start,
    stop,
    validateStoredKey,
    reset,
  };
}

// 简单唯一 id（不引入 crypto.randomUUID 的兼容层）
function generateId(): string {
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
