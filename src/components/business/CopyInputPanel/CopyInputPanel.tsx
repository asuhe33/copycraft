import { Textarea } from '@/components/atoms/Textarea';
import { Input } from '@/components/atoms/Input';
import { useAppContext } from '@/context';

export function CopyInputPanel() {
  const { state, dispatch } = useAppContext();
  const { input } = state;

  const handleChange = (field: keyof typeof input) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    dispatch({ type: 'SET_INPUT', payload: { [field]: e.target.value } });
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="原始文案"
        placeholder="粘贴你想改写的文案内容……"
        value={input.rawText}
        onChange={handleChange('rawText')}
        rows={6}
      />
      <Input
        label="产品名称（可选）"
        placeholder="例如：蜜桃味气泡水"
        value={input.productName}
        onChange={handleChange('productName')}
      />
      <Input
        label="目标受众（可选）"
        placeholder="例如：20 岁左右的年轻女性"
        value={input.targetAudience}
        onChange={handleChange('targetAudience')}
      />
      <Input
        label="关键词（可选，逗号分隔）"
        placeholder="例如：夏日、清凉、0糖、健身"
        value={input.keywords}
        onChange={handleChange('keywords')}
      />
    </div>
  );
}
