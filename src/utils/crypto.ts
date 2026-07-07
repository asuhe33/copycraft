/**
 * 脱敏 API Key：保留前 4 位和后 4 位，中间用 *** 替代。
 * 示例：sk-abcdef1234567890 → sk-a***7890
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return key.slice(0, 2) + '***';
  return `${key.slice(0, 4)}${'*'.repeat(Math.min(8, key.length - 8))}${key.slice(-4)}`;
}

/** 简单的本地存储读写，MVP 阶段先不做加密 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储溢出时静默失败
  }
}
