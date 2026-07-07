import type { CopyInput } from '@/types/copy';

/**
 * 公众号 prompt 模板。
 * 深度长文、专业调性、信息密度高。
 */
export function buildGongzhonghaoUserPrompt(input: CopyInput, config: {
  toneStyle: string;
  maxLength: number;
}): string {
  const { rawText, productName, targetAudience, keywords } = input;

  const parts: string[] = [];
  parts.push(`请根据以下产品信息，写一篇适合微信公众号发布的深度文章。`);
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
    `- 字数上限：约 ${config.maxLength} 字（公众号长文，信息密度高）`,
    `- 结构：吸睛标题 + 痛点引入 + 3-5 个核心段落 + 总结 + 引导关注/转发`,
    `- 每段有小标题，段落之间有逻辑递进`,
    `- 可加入数据、案例、对比，增强说服力`,
    `- 文末带「关注我们」引导语`,
    `- 禁止夸大、禁止虚假描述`,
    `- 不要出现「作为 AI」等出戏表述`,
  ].join('\n'));

  parts.push(``);
  parts.push(`请直接输出公众号文章全文，不需要解释。`);

  return parts.join('\n');
}

export const GONGZHONGHAO_SYSTEM_PROMPT = `你是一个资深公众号编辑，擅长撰写有深度的长文。
你的输出需要：逻辑清晰、信息密度高、有说服力、适合收藏和转发。
遵循平台规范，不出现违禁词、不做过度营销。`.trim();
