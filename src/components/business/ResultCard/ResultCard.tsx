import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { useAppContext } from '@/context';
import { useCopy } from '@/hooks/useCopy';
import { useHistory } from '@/hooks/useHistory';
import { exportMarkdown, exportText } from '@/utils/export';
import type { CopyResult, PlatformId } from '@/types';

interface Props {
  result: CopyResult;
  /** 删除回调（父组件决定如何同步 reducer / history） */
  onDelete?: (id: string) => void;
}

const platformLabel: Record<PlatformId, string> = {
  xiaohongshu: '📕 小红书',
  weibo: '🔥 微博',
  douyin: '🎵 抖音',
  gongzhonghao: '💬 公众号',
};

const platformColor: Record<PlatformId, string> = {
  xiaohongshu: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  weibo: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  douyin: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
  gongzhonghao: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
};

export function ResultCard({ result, onDelete }: Props) {
  const { dispatch } = useAppContext();
  const { update: updateHistory } = useHistory();
  const { copied, copy } = useCopy();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result.content);
  const [copiedText, setCopiedText] = useState(false);

  const wordCount = result.content.length;

  const handleCopy = async () => {
    const ok = await copy(result.content);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    }
  };

  // 编辑保存 → 同步 reducer + history
  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    dispatch({ type: 'RESULT_UPDATE', payload: { id: result.id, content: trimmed } });
    updateHistory(result.id, trimmed);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm('确定要删除这条生成结果吗？')) return;
    dispatch({ type: 'RESULT_DELETE', payload: result.id });
    onDelete?.(result.id);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 space-y-3">
      {/* 头部：平台 + 时间 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className={`px-2 py-0.5 rounded-full ${platformColor[result.platformId]}`}>
          {platformLabel[result.platformId]}
        </span>
        <span>
          {new Date(result.createdAt).toLocaleString('zh-CN', { hour12: false })} · {wordCount} 字
        </span>
      </div>

      {/* 内容区 */}
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[160px] rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-words">
          {result.content}
        </div>
      )}

      {/* 操作区 */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(result.content); }}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              保存
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => { setDraft(result.content); setEditing(true); }}>
              ✏️ 编辑
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copiedText || copied ? '✓ 已复制' : '📋 复制'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => exportMarkdown(result)}>
              ⬇️ MD
            </Button>
            <Button size="sm" variant="secondary" onClick={() => exportText(result)}>
              ⬇️ TXT
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              🗑 删除
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
