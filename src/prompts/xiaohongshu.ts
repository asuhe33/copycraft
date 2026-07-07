import type { CopyInput } from '@/types/copy';

/**
 * 小红书 prompt 模板。
 * 根据产品/受众/关键词生成口语化、带 emoji、带话题的种草笔记。
 */
export function buildXiaohongshuUserPrompt(input: CopyInput, config: {
  toneStyle: string;
  maxLength: number;
}): string {
  const { rawText, productName, targetAudience, keywords } = input;

  const parts: string[] = [];

  parts.push(`请根据以下产品信息，写一篇小红书风格的种草笔记。`);
  parts.push(``);
  parts.push(`## 产品/内容`);
  parts.push(rawText);

  if (productName) {
    parts.push(``);
    parts.push(`## 产品名：${productName}`);
  }
  if (targetAudience) {
    parts.push(`## 目标用户：${targetAudience}`);
  }
  if (keywords) {
    parts.push(`## 关键词：${keywords}`);
  }

  parts.push(``);
  parts.push(`## 写作要求`);
  parts.push([
    `- 语气风格：${config.toneStyle}`,
    `- 字数上限：约 ${config.maxLength} 字`,
    `- 结构：引人注目的标题 + 分段正文 + 真实使用感受 + 结尾互动引导`,
    `- 至少带 3 个 emoji，自然穿插，不要堆砌`,
    `- 带 3-5 个话题标签（#xxx 格式），与内容强相关`,
    `- 严禁夸大、严禁虚假描述；保持真实感与可读性`,
    `- 不要出现「作为 AI」等出戏表述`,
  ].join('\n'));

  parts.push(``);
  parts.push(`请直接输出笔记全文，不需要解释。`);

  return parts.join('\n');
}

export const XIAOHONGSHU_SYSTEM_PROMPT = `你是一个资深小红书文案策划师，擅长撰写有吸引力的种草笔记。
你的输出需要：真实感受优先、场景代入感强、口语化、有信息量、能带动收藏和评论。
遵循平台规范，不出现违禁词、不做过度营销。`.trim();
