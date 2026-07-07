import { useCallback, useEffect, useState } from 'react';
import type { CopyResult } from '@/types/copy';
import { loadFromStorage, saveToStorage } from '@/utils/crypto';

/**
 * 历史变更事件总线（module-level）。
 * useHistory 写入后发出，useSync 订阅 —— 避免循环依赖 & prop drilling。
 */
type Listener = () => void;
const historyChangeListeners = new Set<Listener>();
export function onHistoryChange(fn: Listener): () => void {
  historyChangeListeners.add(fn);
  return () => { historyChangeListeners.delete(fn); }
}
function emitHistoryChange() {
  for (const fn of historyChangeListeners) {
    try { fn(); } catch { /* */ }
  }
}

const STORAGE_KEY = 'copycraft_history';
const MAX_ITEMS = 100; // 最多保留 100 条，防止 localStorage 溢出

interface HistoryState {
  items: CopyResult[];
  ready: boolean;
  /** 版本号：每次服务端胜出覆盖 + 本地写都 ++，作为前端 updated_at（毫秒）的替代 */
  tick: number;
}

/**
 * 历史记录 Hook。
 * 独立于 AppContext，专门管理 localStorage 的持久化。
 * 这是「单一职责」——生成状态在 reducer，历史存档在这里。
 */
export function useHistory() {
  const [state, setState] = useState<HistoryState>({ items: [], ready: false, tick: Date.now() });

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const stored = loadFromStorage<CopyResult[]>(STORAGE_KEY, []);
    const restored = Array.isArray(stored) ? stored : [];
    setState({ items: restored, ready: true, tick: Date.now() });
  }, []);

  // 持久化副作用
  useEffect(() => {
    if (state.ready) {
      saveToStorage(STORAGE_KEY, state.items);
    }
  }, [state.items, state.ready]);

  /** 通知云端同步调度 */
  const notify = useCallback(() => {
    emitHistoryChange();
  }, []);

  const add = useCallback((item: CopyResult) => {
    setState((prev) => ({
      ...prev,
      items: [item, ...prev.items].slice(0, MAX_ITEMS),
      tick: Date.now(),
    }));
    notify();
  }, [notify]);

  const update = useCallback((id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, content, updatedAt: Date.now() } : it)),
      tick: Date.now(),
    }));
    notify();
  }, [notify]);

  const remove = useCallback((id: string) => {
    // 例：也写入一条 deleted 软记录让服务端知道删了（防其他设备复活）
    // 简化：本地删 + 推送一条 deleted payload
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
      tick: Date.now(),
    }));
    notify();
  }, [notify]);

  const clearAll = useCallback(() => {
    setState((prev) => ({ ...prev, items: [], tick: Date.now() }));
    notify();
  }, [notify]);

  const clearOldKeepNewest = useCallback((keep: number = 50) => {
    setState((prev) => ({ ...prev, items: prev.items.slice(0, keep), tick: Date.now() }));
    notify();
  }, [notify]);

  /** 服务端覆盖整表（合并冲突胜出时） */
  const replaceAll = useCallback((items: CopyResult[]) => {
    setState((prev) => ({ ...prev, items, tick: Date.now() }));
    // 注意：这是服务端胜出覆盖，不用再 push 回服务端以免广播循环
  }, []);

  return {
    items: state.items,
    ready: state.ready,
    replaceAll,
    add,
    update,
    remove,
    clearAll,
    clearOldKeepNewest,
  };
}

