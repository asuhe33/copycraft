import type { CopyInput } from '@/types/copy';

/**
 * 抖音 prompt 模板。
 * 短视频口播脚本、3 秒钩子、紧凑节奏感。
 */
export function buildDouyinUserPrompt(input: CopyInput, config: {
  toneStyle: string;
  maxLength: number;
}): string {
  const { rawText, productName, targetAudience, keywords } = input;

  const parts: string[] = [];
  parts.push(`请根据以下产品信息，写一段适合抖音短视频的口播脚本。`);
  parts.push(``);
  parts.push(`## 产品/内容`);
  parts.push(rawText);

  if (productName) parts.push(`## 产品名：${productName}`);
  if (targetAudience) parts.push(`## 目标用户：${targetAudience}`);
  if (keywords) parts.push(`## 关键词：${keywords}`);

  parts.push(``);
  parts.push(`## 写作要求`);
  parts.push([
    `- 语气风格：${config.toneStyle}`,
    `- 字数上限：约 ${config.maxLength} 字（口播语速约 200-250 字/分钟）`,
    `- 结构：3 秒钩子（反问/痛点/悬念）+ 产品卖点 2-3 条 + 结尾引导（点赞/关注/评论）`,
    `- 节奏短促，每句不超过 20 字，适合 15-60 秒短视频`,
    `- 带 3-5 个话题标签（#xxx 格式），与内容强相关`,
    `- 可加入「家人们」「绝绝子」「真的绝了」等抖音热词（自然融入，不要堆砌）`,
    `- 禁止夸大、禁止虚假描述`,
    `- 不要出现「作为 AI」等出戏表述`,
  ].join('\n'));

  parts.push(``);
  parts.push(`请直接输出口播脚本全文，不需要解释。`);

  return parts.join('\n');
}

export const DOUYIN_SYSTEM_PROMPT = `你是一个资深抖音短视频脚本策划，擅长撰写有吸引力的口播文案。
你的输出需要：开头抓人、信息密度高、节奏紧凑、引导互动。
遵循平台规范，不出现违禁词、不做过度营销。`.trim();
