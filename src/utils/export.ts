import type { CopyResult, PlatformId } from '@/types';

// ----------------------------------------------------------------------
// 内部工具
// ----------------------------------------------------------------------

const PLATFORM_LABEL: Record<PlatformId, string> = {
  xiaohongshu: '小红书',
  weibo: '微博',
  douyin: '抖音',
  gongzhonghao: '公众号',
};

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 触发浏览器下载 */
function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(s: string): string {
  return s.replace(/[<>:"/\|?*\n\r]/g, '').slice(0, 40).trim() || 'CopyCraft';
}

// ----------------------------------------------------------------------
// 导出 Markdown
// ----------------------------------------------------------------------

/** 单条结果 → Markdown 字符串 */
export function toMarkdown(result: CopyResult): string {
  const time = new Date(result.createdAt).toLocaleString('zh-CN', { hour12: false });
  return [
    `# 文案生成结果`,
    ``,
    `- 平台：${PLATFORM_LABEL[result.platformId]}`,
    `- 生成时间：${time}`,
    `- 字数统计：${result.content.length} 字`,
    ``,
    `---`,
    ``,
    result.content,
    ``,
    `---`,
    `由 [CopyCraft](https://github.com/) 生成 @ ${timestamp()}`,
  ].join('\n');
}

/** 全部历史 → 单个 Markdown 文件 */
export function allToMarkdown(items: CopyResult[]): string {
  if (items.length === 0) return '# CopyCraft 导出\n\n暂无记录。\n';
  const sections = items.map((item, i) => {
    const time = new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false });
    return [
      `## 第 ${items.length - i} 条 · ${PLATFORM_LABEL[item.platformId]}`,
      ``,
      `> ${time} · ${item.content.length} 字`,
      ``,
      item.content,
      ``,
    ].join('\n');
  });
  return [
    `# CopyCraft · 历史导出`,
    ``,
    `共 ${items.length} 条 · 导出时间：${timestamp()}`,
    ``,
    `---`,
    ``,
    ...sections,
  ].join('\n');
}

// ----------------------------------------------------------------------
// 触发下载的便捷函数
// ----------------------------------------------------------------------

export function exportMarkdown(result: CopyResult): void {
  const md = toMarkdown(result);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const name = safeFilename(result.content.slice(0, 8)) || '文案';
  download(blob, `${name}.md`);
}

export function exportAllMarkdown(items: CopyResult[]): void {
  const md = allToMarkdown(items);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  download(blob, `CopyCraft_历史导出_${stamp}.md`);
}

export function exportText(result: CopyResult): void {
  const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
  const name = safeFilename(result.content.slice(0, 8)) || '文案';
  download(blob, `${name}.txt`);
}

// ----------------------------------------------------------------------
// 复制到剪贴板（带降级）
// ----------------------------------------------------------------------

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 降级到 execCommand
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
