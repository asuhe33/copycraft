import type { CopyInput, GenerationConfig } from '@/types/copy';
import { buildXiaohongshuUserPrompt, XIAOHONGSHU_SYSTEM_PROMPT } from './xiaohongshu';
import { buildWeiboUserPrompt, WEIBO_SYSTEM_PROMPT } from './weibo';
import { buildDouyinUserPrompt, DOUYIN_SYSTEM_PROMPT } from './douyin';
import { buildGongzhonghaoUserPrompt, GONGZHONGHAO_SYSTEM_PROMPT } from './gongzhonghao';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptPayload {
  system: string;
  messages: ChatMessage[];
}

/**
 * 平台 prompt 工厂。
 *
 * 扩展指南：新增平台时只需要：
 *   1. 在 src/types/platform.ts 的 PlatformId union type 加一项
 *   2. 在 src/constants/platforms.ts 加静态元数据 + enabled:true
 *   3. 在 src/prompts/<platform>.ts 写 prompt 模板 + system prompt
 *   4. 在本文件的 switch 中加一个 case 分支
 *   5. 在 PlatformPicker 的 iconMap 中加一个 emoji
 */
export function buildPrompt(
  platformId: GenerationConfig['platformId'],
  input: CopyInput,
  config: GenerationConfig,
): PromptPayload {
  const shared = { toneStyle: config.toneStyle, maxLength: config.maxLength };

  switch (platformId) {
    // ✅ UI 已开放
    case 'xiaohongshu': {
      return {
        system: XIAOHONGSHU_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildXiaohongshuUserPrompt(input, shared) }],
      };
    }

    // 🚧 UI 未开放（constants/platforms.ts 中 enabled: false）—— prompt 已就绪，后续启用只需改 enabled
    case 'weibo': {
      return {
        system: WEIBO_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildWeiboUserPrompt(input, shared) }],
      };
    }

    case 'douyin': {
      return {
        system: DOUYIN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildDouyinUserPrompt(input, shared) }],
      };
    }

    case 'gongzhonghao': {
      return {
        system: GONGZHONGHAO_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildGongzhonghaoUserPrompt(input, shared) }],
      };
    }

    // 未知平台 → 小红书兜底
    default: {
      return {
        system: XIAOHONGSHU_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildXiaohongshuUserPrompt(input, shared) }],
      };
    }
  }
}

/** 所有可用平台 id（用于测试 / 未来 CLI 生成） */
export const ALL_PLATFORMS: GenerationConfig['platformId'][] = [
  'xiaohongshu',
  'weibo',
  'douyin',
  'gongzhonghao',
];
