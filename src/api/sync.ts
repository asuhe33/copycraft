/**
 * 云同步 API：历史 + 设置双向同步（一次往返全双工）。
 *
 * 同步模型：服务端最后写入胜出（按 updated_at 毫秒比较）。
 * - 入站：客户端把本地副本推上去，服务端仅在 updated_at >= 服务端时写入
 * - 出站：服务端返所有 updated_at > lastSyncAt 的记录（含软删的，客户端按 deleted 处理）
 */

import type { PlatformId } from '@/types/platform';

export interface HistoryPayload {
  id: string;
  content: string;
  platform: PlatformId;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

export interface HistorySyncResult {
  ok: boolean;
  items: HistoryPayload[];
  serverAt: number;
  pushed: number;
}

export interface SettingsPayload {
  toneStyle: string;
  maxLength: number;
  temperature: number;
}

export interface SettingsSyncArgs extends SettingsPayload {
  apikeyEnc?: string;
  updatedAt: number;
}

export interface SettingsSyncResult {
  ok: boolean;
  accepted: boolean;
  settings: SettingsPayload & {
    apikeyPlain: string | null; // 仅当客户端这次提交了 apikeyEnc 且 accepted 时返回
    hasApiKey: boolean;
    updatedAt: number;
  };
  serverAt: number;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function asJson(res: Response) {
  let body: any = null;
  try { body = await res.json(); } catch { /* */ }
  if (!res.ok) throw new ApiError(res.status, body?.error || body?.message || `HTTP ${res.status}`);
  return body;
}

/**
 * 历史同步。token 为 nullable：为 null 时返回空结果。
 */
export async function syncHistory(
  token: string,
  items: HistoryPayload[],
  lastSyncAt: number | null,
): Promise<HistorySyncResult> {
  const r = await fetch('/api/sync/history', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ items, lastSyncAt }),
  });
  const j = await asJson(r);
  return {
    ok: j.ok,
    items: j.items || [],
    serverAt: j.serverAt,
    pushed: j.pushed || 0,
  };
}

/**
 * 设置同步：用户偏好 + API Key（可选）。
 * 客户端需提供 updatedAt（当前本地 settings 的 updated_at 毫秒）；若服务端更新则 accepted=false，
 * 客户端应接受返回的 settings 覆盖本地。
 */
export async function syncSettings(
  token: string,
  args: SettingsSyncArgs,
): Promise<SettingsSyncResult> {
  const r = await fetch('/api/sync/settings', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(args),
  });
  const j = await asJson(r);
  return j as SettingsSyncResult;
}

export { ApiError };
