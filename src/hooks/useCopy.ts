import { useCallback, useState } from 'react';
import { copyToClipboard } from '@/utils/export';

interface UseCopyReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
}

/**
 * 复制 Hook。
 * 返回 copied 状态（自动 1.5s 后重置）和 copy 函数。
 */
export function useCopy(resetMs: number = 1500): UseCopyReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) return false;
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      }
      return ok;
    },
    [resetMs],
  );

  return { copied, copy };
}
