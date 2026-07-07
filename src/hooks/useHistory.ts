import { useCallback, useEffect, useState } from 'react';
import type { CopyResult } from '@/types/copy';
import { loadFromStorage, saveToStorage } from '@/utils/crypto';

const STORAGE_KEY = 'copycraft_history';
const MAX_ITEMS = 100; // 最多保留 100 条，防止 localStorage 溢出

interface HistoryState {
  items: CopyResult[];
  ready: boolean;
}

/**
 * 历史记录 Hook。
 * 独立于 AppContext，专门管理 localStorage 的持久化。
 * 这是「单一职责」——生成状态在 reducer，历史存档在这里。
 */
export function useHistory() {
  const [state, setState] = useState<HistoryState>({ items: [], ready: false });

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const stored = loadFromStorage<CopyResult[]>(STORAGE_KEY, []);
    setState({ items: Array.isArray(stored) ? stored : [], ready: true });
  }, []);

  // 持久化副作用
  useEffect(() => {
    if (state.ready) {
      saveToStorage(STORAGE_KEY, state.items);
    }
  }, [state.items, state.ready]);

  const add = useCallback((item: CopyResult) => {
    setState((prev) => ({
      ...prev,
      items: [item, ...prev.items].slice(0, MAX_ITEMS),
    }));
  }, []);

  const update = useCallback((id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, content } : it)),
    }));
  }, []);

  const remove = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => ({ ...prev, items: [] }));
  }, []);

  const clearOldKeepNewest = useCallback((keep: number = 50) => {
    setState((prev) => ({ ...prev, items: prev.items.slice(0, keep) }));
  }, []);

  return {
    items: state.items,
    ready: state.ready,
    add,
    update,
    remove,
    clearAll,
    clearOldKeepNewest,
  };
}
