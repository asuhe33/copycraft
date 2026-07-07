import type { CopyInput } from '@/types/copy';

/**
 * 微博 prompt 模板。
 * 短平快、话题营销、@用户、限时性。
 */
export function buildWeiboUserPrompt(input: CopyInput, config: {
  toneStyle: string;
  maxLength: number;
}): string {
  const { rawText, productName, targetAudience, keywords } = input;

  const parts: string[] = [];
  parts.push(`请根据以下产品信息，写一条适合微博传播的短文案。`);
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
    `- 字数上限：约 ${config.maxLength} 字（微博短文本，精炼为主）`,
    `- 结构：吸睛开头 + 核心卖点 1-2 条 + 互动引导（转发/评论/点赞）`,
    `- 带 2-3 个话题标签（#xxx 格式），与内容强相关`,
    `- 可适当使用 @好友/@官博 互动句式`,
    `- 禁止夸大、禁止虚假描述`,
    `- 不要出现「作为 AI」等出戏表述`,
  ].join('\n'));

  parts.push(``);
  parts.push(`请直接输出微博文案全文，不需要解释。`);

  return parts.join('\n');
}

export const WEIBO_SYSTEM_PROMPT = `你是一个资深微博运营，擅长撰写有传播力的短文案。
你的输出需要：信息密度高、话题感强、互动性好、适合转发和评论。
遵循平台规范，不出现违禁词、不做过度营销。`.trim();
