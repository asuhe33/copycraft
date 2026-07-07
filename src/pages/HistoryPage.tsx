import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Button } from '@/components/atoms/Button';
import { ResultCard } from '@/components/business/ResultCard';
import { useHistory } from '@/hooks/useHistory';
import { exportAllMarkdown, copyToClipboard } from '@/utils/export';
import { PLATFORMS } from '@/constants/platforms';
import { useCopy } from '@/hooks/useCopy';

type PlatformFilter = 'all' | typeof PLATFORMS[number]['id'];

export function HistoryPage() {
  const { items, ready, remove, clearAll } = useHistory();
  const { copied: allCopied, copy: copyAllText } = useCopy();
  const [keyword, setKeyword] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchPlatform = platformFilter === 'all' || it.platformId === platformFilter;
      const k = keyword.trim().toLowerCase();
      const matchKeyword =
        !k ||
        it.content.toLowerCase().includes(k);
      return matchPlatform && matchKeyword;
    });
  }, [items, keyword, platformFilter]);

  const handleClearAll = () => {
    if (filtered.length === 0) return;
    if (!window.confirm(`确定要清空全部 ${items.length} 条历史记录吗？此操作不可恢复。`)) return;
    clearAll();
  };

  const handleCopyAll = async () => {
    if (filtered.length === 0) return;
    const allText = filtered.map((it, i) => `【${i + 1}】\n${it.content}\n`).join('\n---\n\n');
    await copyAllText(allText);
  };

  if (!ready) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mr-2" />
          加载历史记录…
        </div>
      </PageContainer>
    );
  }

  const platformOptions = [
    { value: 'all', label: `全部平台 (${items.length})` },
    ...PLATFORMS.map((p) => ({
      value: p.id,
      label: `${p.name} (${items.filter((it) => it.platformId === p.id).length})`,
    })),
  ];

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">历史记录</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              共 {items.length} 条，当前筛选 {filtered.length} 条
              {items.length >= 90 && <span className="text-orange-500 ml-2">（接近上限 100 条，建议定期导出清理）</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyAll}
              disabled={filtered.length === 0}
            >
              {allCopied ? '✓ 已复制' : '📋 复制全部文案'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportAllMarkdown(filtered)}
              disabled={filtered.length === 0}
            >
              ⬇️ 导出 MD
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleClearAll}
              disabled={items.length === 0}
            >
              🗑 清空全部
            </Button>
          </div>
        </div>

        {/* 筛选区 */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="🔍 搜索文案关键词…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              options={platformOptions}
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
            />
          </div>
        </div>

        {/* 空态 */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <span className="text-5xl mb-3">📭</span>
            <p className="text-sm">还没有任何生成记录</p>
            <p className="text-xs mt-1">在「生成」页完成一次文案创作，记录会自动保存到这里</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm">没有匹配的记录</p>
            <p className="text-xs mt-1">试试调整关键词或平台筛选条件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <ResultCard key={r.id} result={r} onDelete={remove} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
