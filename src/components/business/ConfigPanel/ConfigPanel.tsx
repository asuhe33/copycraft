import { Select } from '@/components/atoms/Select';
import { Input } from '@/components/atoms/Input';
import { useAppContext } from '@/context';

const toneOptions = [
  { value: '亲切闺蜜', label: '亲切闺蜜' },
  { value: '专业测评', label: '专业测评' },
  { value: '活泼种草', label: '活泼种草' },
  { value: '高级感', label: '高级感' },
  { value: '搞笑幽默', label: '搞笑幽默' },
];

export function ConfigPanel() {
  const { state, dispatch } = useAppContext();
  const { config } = state;

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = field === 'maxLength' || field === 'temperature' ? Number(e.target.value) : e.target.value;
    dispatch({ type: 'SET_CONFIG', payload: { [field]: value } });
  };

  return (
    <div className="space-y-4">
      <Select
        label="语气风格"
        options={toneOptions}
        value={config.toneStyle}
        onChange={handleChange('toneStyle')}
      />
      <Input
        label="最大字数"
        type="number"
        min={50}
        max={2000}
        step={50}
        value={config.maxLength}
        onChange={handleChange('maxLength')}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
          创意度（temperature）：{config.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.1}
          value={config.temperature}
          onChange={handleChange('temperature')}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>稳定</span>
          <span>创意</span>
        </div>
      </div>
    </div>
  );
}
