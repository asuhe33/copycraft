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

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function timestamp(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function safeFilename(s: string): string {
  return s.replace(/[<>:"/\|?*\n\r]/g, '').slice(0, 40).trim() || 'CopyCraft';
}

function getBlobText(text: string, type: 'md' | 'txt'): Blob {
  const mime = type === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
  // 加 BOM 防止中文在 Windows 记事本乱码
  return new Blob([text], { type: mime });
}

// ----------------------------------------------------------------------
// 传统下载方式（所有浏览器）
// ----------------------------------------------------------------------

/** 触发浏览器下载（传统方式） */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    `由 CopyCraft（文案魔匠）生成 @ ${timestamp()}`,
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
// 文件下载（传统方式）
// ----------------------------------------------------------------------

export function exportMarkdown(result: CopyResult): void {
  const md = toMarkdown(result);
  const blob = getBlobText(md, 'md');
  const name = safeFilename(result.content.slice(0, 8)) || '文案';
  download(blob, `${name}.md`);
}

export function exportAllMarkdown(items: CopyResult[]): void {
  const md = allToMarkdown(items);
  const blob = getBlobText(md, 'md');
  const stamp = new Date().toISOString().slice(0, 10);
  download(blob, `CopyCraft_历史导出_${stamp}.md`);
}

export function exportText(result: CopyResult): void {
  const blob = getBlobText(result.content, 'txt');
  const name = safeFilename(result.content.slice(0, 8)) || '文案';
  download(blob, `${name}.txt`);
}

// ----------------------------------------------------------------------
// 现代方式：File System Access API（PWA/桌面端导出到指定目录）
// ----------------------------------------------------------------------

interface ShowSaveFilePickerOptions {
  suggestedName: string;
  types: Array<{ description: string; accept: Record<string, string[]> }>;
}

const hasFileAccess = 'showSaveFilePicker' in window;

/** 导出 Markdown 到用户选择的文件（现代浏览器 PWA 体验更佳） */
export async function exportMarkdownPicker(result: CopyResult): Promise<boolean> {
  const md = toMarkdown(result);
  const name = (safeFilename(result.content.slice(0, 8)) || '文案') + '.md';
  return saveFile(md, name, 'md');
}

/** 导出纯文本到用户选择的文件 */
export async function exportTextPicker(result: CopyResult): Promise<boolean> {
  const name = (safeFilename(result.content.slice(0, 8)) || '文案') + '.txt';
  return saveFile(result.content, name, 'txt');
}

/** 导出全部历史到用户选择的文件 */
export async function exportAllMarkdownPicker(items: CopyResult[]): Promise<boolean> {
  const md = allToMarkdown(items);
  const stamp = new Date().toISOString().slice(0, 10);
  return saveFile(md, `CopyCraft_历史导出_${stamp}.md`, 'md');
}

/**
 * 使用 File System Access API 弹出"另存为"对话框（仅限 modern browsers）。
 * 如果不支持，回退到传统下载。
 */
async function saveFile(content: string, suggestedName: string, type: 'md' | 'txt'): Promise<boolean> {
  const mime = type === 'md' ? 'text/markdown' : 'text/plain';
  const ext = type === 'md' ? '.md' : '.txt';

  if (hasFileAccess) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: type === 'md' ? 'Markdown 文件' : '纯文本文件',
            accept: { [mime]: [ext] },
          },
        ],
      });
      const writable = await (handle as unknown as {
        createWritable: () => Promise<{
          write: (data: string | Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }).createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      const err = e as Error;
      // AbortError = 用户取消对话框，不算失败
      if (err.name === 'AbortError') return false;
      // 其他错误，回退传统下载
    }
  }

  // 降级到传统下载
  const blob = getBlobText(content, type);
  download(blob, suggestedName);
  return true;
}

/** 当前环境是否支持导出到指定目录 */
export function supportsDirectoryPicker(): boolean {
  return !!hasFileAccess;
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
    // 降级
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
