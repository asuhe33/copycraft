import { ResultCard } from '@/components/business/ResultCard';
import { Spinner } from '@/components/atoms/Spinner';
import type { CopyResult } from '@/types';

interface Props {
  results: CopyResult[];
  streamingText: string;
  generating: boolean;
}

export function ResultList({ results, streamingText, generating }: Props) {
  // 流式进行中 → 实时显示占位卡片
  if (generating && streamingText) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-brand-600 dark:text-brand-300 font-medium">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            正在生成…
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-words min-h-[60px]">
            {streamingText}
            <span className="inline-block w-1.5 h-4 align-[-2px] ml-0.5 bg-brand-500 animate-pulse" />
          </div>
        </div>
        {/* 历史结果 */}
        {results.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">历史生成</p>
            {results.map((r) => <ResultCard key={r.id} result={r} />)}
          </div>
        )}
      </div>
    );
  }

  // 空态
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <span className="text-5xl mb-3">✨</span>
        <p className="text-sm">还没有生成记录</p>
        <p className="text-xs mt-1">在左侧填好文案和配置，点击「生成文案」开始</p>
      </div>
    );
  }

  // 结果列表
  return (
    <div className="space-y-4">
      {results.map((r) => <ResultCard key={r.id} result={r} />)}
    </div>
  );
}
