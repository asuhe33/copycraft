import { PLATFORMS } from '@/constants/platforms';
import { useAppContext } from '@/context';

const iconMap: Record<string, string> = {
  redbook: '📕',
  weibo: '🔥',
  douyin: '🎵',
  gongzhonghao: '💬',
};

export function PlatformPicker() {
  const { state, dispatch } = useAppContext();
  const currentId = state.config.platformId;

  const handleSelect = (id: string, enabled: boolean) => {
    if (!enabled) return;
    dispatch({ type: 'SET_CONFIG', payload: { platformId: id as typeof currentId } });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">目标平台</p>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => {
          const active = p.id === currentId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!p.enabled}
              onClick={() => handleSelect(p.id, p.enabled)}
              className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : p.enabled
                    ? 'border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="text-xl leading-none">{iconMap[p.icon] ?? '📱'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
