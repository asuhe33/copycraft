import type { CopyInput, GenerationConfig } from '@/types/copy';
import { buildXiaohongshuUserPrompt, XIAOHONGSHU_SYSTEM_PROMPT } from './xiaohongshu';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptPayload {
  system: string;
  messages: ChatMessage[];
}

/**
 * 平台 prompt 工厂：根据平台 id + 输入 + 配置生成最终 prompt 结构。
 * 多平台扩展点：新增平台时在此增加分支即可。
 */
export function buildPrompt(
  platformId: GenerationConfig['platformId'],
  input: CopyInput,
  config: GenerationConfig,
): PromptPayload {
  switch (platformId) {
    case 'xiaohongshu':
    default: {
      const content = buildXiaohongshuUserPrompt(input, {
        toneStyle: config.toneStyle,
        maxLength: config.maxLength,
      });
      return {
        system: XIAOHONGSHU_SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      };
    }
    // 后续扩展：
    // case 'weibo':    return buildWeiboPrompt(...)
    // case 'douyin':   return buildDouyinPrompt(...)
  }
}
