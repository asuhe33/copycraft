import { useEffect, useRef } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CopyInputPanel } from '@/components/business/CopyInputPanel';
import { PlatformPicker } from '@/components/business/PlatformPicker';
import { ConfigPanel } from '@/components/business/ConfigPanel';
import { ResultCard } from '@/components/business/ResultCard';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useAppContext } from '@/context';
import { useGenerate } from '@/hooks/useGenerate';
import { useHistory } from '@/hooks/useHistory';

export function HomePage() {
  const { state, dispatch } = useAppContext();
  const { generating, error, streamingText, start, stop } = useGenerate();
  const { add: addHistory, remove: removeHistory } = useHistory();
  const syncedRef = useRef<Set<string>>(new Set());

  const keyMissing = !state.key.value && !state.key.masked;

  // 监听生成完成：把新结果同步写入历史
  useEffect(() => {
    const last = state.result.items[0];
    if (last && !syncedRef.current.has(last.id)) {
      addHistory(last);
      syncedRef.current.add(last.id);
    }
  }, [state.result.items, addHistory, dispatch]);

  const handleDelete = (id: string) => {
    removeHistory(id);
    syncedRef.current.delete(id);
  };

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 输入区 */}
        <section className="lg:col-span-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📝</span> 原始文案输入
            </h2>
            <CopyInputPanel />
          </div>
        </section>

        {/* 配置区 */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🎯</span> 目标平台
            </h2>
            <PlatformPicker />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> 生成配置
            </h2>
            <ConfigPanel />
          </div>

          <div className="space-y-3">
            {generating ? (
              <Button variant="danger" block size="lg" onClick={stop}>
                ⏹ 中止生成
              </Button>
            ) : (
              <Button block size="lg" onClick={start} disabled={keyMissing}>
                {keyMissing ? '🔑 请先到「设置」页配置 Key' : '🚀 生成文案'}
              </Button>
            )}
            {keyMissing && (
              <p className="text-xs text-center text-red-500 dark:text-red-400">
                未检测到有效 API Key，生成将被禁用
              </p>
            )}
          </div>
        </section>

        {/* 结果区 */}
        <section className="lg:col-span-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🚀</span> 生成结果
                {generating && <Spinner size="sm" />}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                共 {state.result.items.length} 条
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                <p className="font-medium mb-1">⚠️ 生成失败</p>
                <p className="text-xs">{error}</p>
                {error.includes('API Key') ? (
                  <p className="text-xs mt-1">提示：请打开右上角「设置」→ API 密钥，重新保存您的 DeepSeek Key</p>
                ) : error.includes('网络') ? (
                  <p className="text-xs mt-1">提示：DeepSeek 当前网络不可用，检查代理或稍后重试</p>
                ) : null}
              </div>
            )}

            {/* 流式进行中 */}
            {generating && streamingText && (
              <div className="mb-4">
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
              </div>
            )}

            {/* 空态 */}
            {state.result.items.length === 0 && !generating && !streamingText && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                <span className="text-5xl mb-3">✨</span>
                <p className="text-sm">还没有生成记录</p>
                <p className="text-xs mt-1">在左侧填好文案和配置，点击「生成文案」开始</p>
              </div>
            )}

            {/* 结果列表 */}
            {state.result.items.length > 0 && (
              <div className="space-y-4">
                {state.result.items.map((r) => (
                  <ResultCard key={r.id} result={r} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
