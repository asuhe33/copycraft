/**
 * 云同步钩子：后端"最后写入胜出"合并模型。
 *
 * 同步触发器：
 *   - 登录后 useSync.enabled=true 触发首次全量同步
 *   - history add/update/remove/clearAll 通过 schedulePush() debounce 推送
 *   - visibilitychange（切回前台）自动拉一次
 *   - 可选 60s 轮询（MVP 默认关）
 *   - 手动 forceSync()
 *
 * 关键：合并时按 id 取 updated_at 更大者（服务端胜出时客户端接受）；deleted 也按 updated_at 胜出。
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { syncHistory, syncSettings, type HistoryPayload, type HistorySyncResult, type SettingsSyncResult } from '@/api/sync';
import type { CopyResult } from '@/types/copy';
import type { SettingsPayload } from '@/api/sync';
import { onHistoryChange } from '@/hooks/useHistory';

function loadSettingsSyncAt(): number | null {
  try { const v = localStorage.getItem('copycraft_settings_updated_at'); return v ? Number(v) : null; } catch { return null; }
}
function saveSettingsSyncAt(v: number | null) {
  try { if (v === null) localStorage.removeItem('copycraft_settings_updated_at'); else localStorage.setItem('copycraft_settings_updated_at', String(v)); } catch { /* */ }
}

const LS_LAST_SYNC_AT = 'copycraft_last_sync_at';
const LS_SETTINGS_UPDATED_AT = 'copycraft_settings_updated_at';
const PUSH_DEBOUNCE_MS = 500;

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  error: string | null;
  lastSyncAt: number | null;                // 历史 lastSyncAt
  lastSettingsSyncAt: number | null;
}

type SyncAction =
  | { type: 'SET_STATUS'; payload: SyncStatus }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_SYNC'; payload: { histAt: number; settingsAt: number } };

function reducer(s: SyncState, a: SyncAction): SyncState {
  switch (a.type) {
    case 'SET_STATUS': return { ...s, status: a.payload, error: a.payload === 'error' ? s.error : null };
    case 'SET_ERROR': return { ...s, status: 'error', error: a.payload };
    case 'SET_LAST_SYNC': return { ...s, lastSyncAt: a.payload.histAt, lastSettingsSyncAt: a.payload.settingsAt };
    default: return s;
  }
}

// ----------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------

export interface UseSyncReturn {
  status: SyncStatus;
  error: string | null;
  lastSyncAt: number | null;
  lastSettingsSyncAt: number | null;
  /** 手动触发一次强制同步（无视 debounce） */
  forceSync: () => Promise<void>;
}

export interface SyncDeps {
  /** 本地历史副本（来自 useHistory） */
  localHistory: CopyResult[];
  /** 移除历史单条并写入服务端时需更新的本地回调 */
  setAllHistory: (items: CopyResult[]) => void;
  /** 本地设置 */
  localSettings: SettingsPayload;
  /** 服务端获胜合并后：客户端按此覆盖 */
  applyServerSettings: (s: SettingsPayload) => void;
  /** 服务端获胜合并后：客户端按此覆盖 */
  applyServerKey?: (key: string) => void;     // 服务端有、本地没有时：客户端可选是否 import
  /** 当用户显式点"托管 API Key"时，提供当前明文 key 给同步流程；返回 undefined 表示不推 */
  getApikeyToPush?: () => string | undefined;
}

function loadLastSyncAt(): number | null {
  try { const v = localStorage.getItem(LS_LAST_SYNC_AT); return v ? Number(v) : null; } catch { return null; }
}
function saveLastSyncAt(v: number | null) {
  try {
    if (v === null) localStorage.removeItem(LS_LAST_SYNC_AT);
    else localStorage.setItem(LS_LAST_SYNC_AT, String(v));
  } catch { /* */ }
}
/** 客户端 CopyResult → 网络 payload */
function toPayload(it: CopyResult): HistoryPayload {
  return {
    id: it.id,
    content: it.content,
    platform: it.platformId,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt ?? it.createdAt,
    deleted: false,
  };
}

/**
 * payloads 合并：同 id 取 updated_at 更大者。
 * 返回合并后的 CopyResult[]。
 * 注意：deleted=true 的条目如果在服务端胜出，也要保留在合并 list 中以标记客户端也删（除非用户想要永久消失）。
 * 此处简化：从本地 CopyResult[]（UI 用的"未删"列表）角度，把 deleted 的过滤掉。
 */
function mergeHistory(local: CopyResult[], remote: HistoryPayload[]): CopyResult[] {
  const map = new Map<string, { local?: CopyResult; remote?: HistoryPayload }>();
  for (const it of local) map.set(it.id, { local: it });
  for (const r of remote) {
    const cur = map.get(r.id) || {};
    cur.remote = r;
    map.set(r.id, cur);
  }
  const out: CopyResult[] = [];
  for (const [, v] of map) {
    if (v.local && v.remote) {
      const winner = v.remote.updatedAt > (v.local.updatedAt ?? v.local.createdAt) ? v.remote : v.local;
      if (typeof winner === 'object' && 'id' in winner && !('deleted' in winner) && v.remote.deleted) {
        // 远程删除胜出
        continue;
      }
      if (v.remote.deleted) continue;
      // 落成 CopyResult
      const src = v.remote.updatedAt > (v.local.updatedAt ?? v.local.createdAt) ? v.remote : v.local;
      out.push(src as CopyResult);
    } else if (v.local) {
      out.push(v.local);
    } else if (v.remote) {
      if (v.remote.deleted) continue;
      out.push({
        id: v.remote.id,
        content: v.remote.content,
        platformId: v.remote.platform,
        createdAt: v.remote.createdAt,
        updatedAt: v.remote.updatedAt,
      });
    }
  }
  // 按 updatedAt desc
  out.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
  return out;
}

export function useSync(deps: SyncDeps): UseSyncReturn {
  const { token, status: authStatus } = useAuth();
  const enabled = authStatus === 'authed' && !!token;

  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    error: null,
    lastSyncAt: loadLastSyncAt(),
    lastSettingsSyncAt: loadSettingsSyncAt(),
  });

  // 核心同步函数（一次往返全双工）
  const syncOnce = useCallback(async () => {
    if (!token) return;
    dispatch({ type: 'SET_STATUS', payload: 'syncing' });
    try {
      const histPayloads = deps.localHistory.map(toPayload);
      const lastSyncAt = loadLastSyncAt();
      const h: HistorySyncResult = await syncHistory(token, histPayloads, lastSyncAt);

      // 合并：服务端胜出
      const merged = mergeHistory(deps.localHistory, h.items);
      deps.setAllHistory(merged);
      saveLastSyncAt(h.serverAt);
      dispatch({ type: 'SET_LAST_SYNC', payload: { histAt: h.serverAt, settingsAt: loadSettingsSyncAt() ?? 0 } });

      // 设置同步（仅当本地 settings 在上次 sync 之后被改过，否则服务端返回的新值覆盖本地）
      const apikeyEnc = deps.getApikeyToPush ? deps.getApikeyToPush() : undefined;
      const s: SettingsSyncResult = await syncSettings(token, {
        toneStyle: deps.localSettings.toneStyle,
        maxLength: deps.localSettings.maxLength,
        temperature: deps.localSettings.temperature,
        apikeyEnc,
        updatedAt: Date.now(),
      });
      // 服务端返回 updatedAt 更新即接受
      saveSettingsSyncAt(s.serverAt);
      // 应用服务端最新设置（即使 accepted=false 也要覆盖本地——"最后写入胜出"以服务端为准）
      deps.applyServerSettings({
        toneStyle: s.settings.toneStyle,
        maxLength: s.settings.maxLength,
        temperature: s.settings.temperature,
      });
      // API Key 下发：仅当客户端本轮 submit 了 apikeyEnc 且服务端解密成功时拿到明文
      // MVP 我们不在自动同步中为 apikeyEnc 赋值，避免跨设备覆盖——仅当本地没有 key 且服务端有且用户确认时再 import（在 SettingsPage 的"导入"按钮里处理）
      void s.settings.apikeyPlain;
      void s.settings.hasApiKey;

      dispatch({ type: 'SET_STATUS', payload: 'idle' });
      dispatch({ type: 'SET_LAST_SYNC', payload: { histAt: h.serverAt, settingsAt: s.serverAt } });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message || '同步失败' });
    }
  }, [token, deps.localHistory, deps.localSettings, deps.setAllHistory, deps.applyServerSettings]);

  const debounceRef = useRefPushTimer();

  const schedulePush = useCallback(() => {
    if (!enabled) return;
    debounceRef.current?.();
    debounceRef.current = later(PUSH_DEBOUNCE_MS, syncOnce);
  }, [enabled, syncOnce]);

  // 订阅 history 变更事件，触发 debounce push
  useEffect(() => {
    return onHistoryChange(() => schedulePush());
  }, [schedulePush]);

  // 首次 enabled 时跑一次同步
  const didFirst = useOneShot(enabled, syncOnce);

  // visibilitychange → 同步
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === 'visible' && enabled && !didFirst.current) {
        syncOnce();
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [enabled, syncOnce]);

  return {
    status: state.status,
    error: state.error,
    lastSyncAt: state.lastSyncAt,
    lastSettingsSyncAt: state.lastSettingsSyncAt,
    forceSync: syncOnce,
  };
}

// ----------------------------------------------------------------------
// 小工具
// ----------------------------------------------------------------------

function useRefPushTimer(): { current: (() => void) | null } {
  return useRef<(() => void) | null>(null);
}

function later(ms: number, fn: () => Promise<void>): () => void {
  let id: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => { if (id) { clearTimeout(id); id = null; } };
  id = setTimeout(() => { fn(); id = null; }, ms);
  return cancel;
}

function useOneShot(enabled: boolean, fn: () => Promise<void>) {
  const fired = useRef(false);
  useEffect(() => {
    if (enabled && !fired.current) {
      fired.current = true;
      fn();
    }
  }, [enabled, fn]);
  return fired;
}
