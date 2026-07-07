import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { useAppContext } from '@/context';
import { useCopy } from '@/hooks/useCopy';
import { useHistory } from '@/hooks/useHistory';
import {
  exportMarkdown,
  exportText,
  exportMarkdownPicker,
  exportTextPicker,
  supportsDirectoryPicker,
} from '@/utils/export';
import type { CopyResult, PlatformId } from '@/types';

interface Props {
  result: CopyResult;
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
  const [exporting, setExporting] = useState(false);

  const wordCount = result.content.length;
  const canSaveToDir = supportsDirectoryPicker();

  const handleCopy = async () => {
    const ok = await copy(result.content);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    }
  };

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

  // 导出到指定目录（File System Access API）
  const handleExportMdPicker = async () => {
    setExporting(true);
    const ok = await exportMarkdownPicker(result);
    setExporting(false);
    if (!ok) alert('导出失败或被取消');
  };

  const handleExportTxtPicker = async () => {
    setExporting(true);
    const ok = await exportTextPicker(result);
    setExporting(false);
    if (!ok) alert('导出失败或被取消');
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

            {/* 导出到目录（File System Access）—— PWA/桌面浏览器 */}
            {canSaveToDir && (
              <>
                <Button size="sm" variant="secondary" onClick={handleExportMdPicker} loading={exporting}>
                  💾 存 MD
                </Button>
                <Button size="sm" variant="secondary" onClick={handleExportTxtPicker} loading={exporting}>
                  💾 存 TXT
                </Button>
              </>
            )}

            {/* 传统下载 —— 移动端 Safari / 旧浏览器 */}
            {!canSaveToDir && (
              <>
                <Button size="sm" variant="secondary" onClick={() => exportMarkdown(result)}>
                  ⬇️ MD
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportText(result)}>
                  ⬇️ TXT
                </Button>
              </>
            )}

            <Button size="sm" variant="danger" onClick={handleDelete}>
              🗑 删除
            </Button>
          </>
        )}
      </div>

      {/* 保存到文件提示 */}
      {canSaveToDir && !editing && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          💡 支持「存 MD/TXT」选择本地目录保存
        </p>
      )}
    </div>
  );
}
