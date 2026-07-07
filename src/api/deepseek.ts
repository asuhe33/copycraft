import { buildPrompt } from '@/prompts';
import type { CopyInput, GenerationConfig } from '@/types/copy';
import { DEFAULT_BASE_URL, DEFAULT_MODEL } from '@/constants/defaults';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
const BACKEND_URL = '/api/generate';

export interface GenerateParams {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  input: CopyInput;
  config: GenerationConfig;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

interface SSEResp {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

export async function generateStream(p: GenerateParams): Promise<string> {
  const prompt = buildPrompt(p.config.platformId, p.input, p.config);
  const msgs = [{ role: 'system' as const, content: prompt.system }, ...prompt.messages];
  return USE_BACKEND
    ? viaBackend(p, msgs)
    : directDeepSeek(p, msgs);
}

async function viaBackend(p: GenerateParams, msgs: { role: string; content: string }[]) {
  let res: Response;
  try {
    res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, model: 'deepseek-chat', temperature: p.config.temperature, stream: true }),
      signal: p.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return '';
    throw new Error(`后端连接失败：${(e as Error).message}（请启动 npm run server）`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(mapUpstream(res.status, (err as any)?.error?.message));
  }
  if (!res.body) throw new Error('后端响应体为空');
  return readSSE(res.body, p);
}

async function directDeepSeek(p: GenerateParams, msgs: { role: string; content: string }[]) {
  const base = (p.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({ model: p.model ?? DEFAULT_MODEL, messages: msgs, temperature: p.config.temperature, stream: true }),
      signal: p.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return '';
    throw new Error(`网络请求失败：${(e as Error).message}`);
  }
  if (!res.ok) {
    const txt = await res.text();
    let friendly = `HTTP ${res.status}`;
    try { const j = JSON.parse(txt); if (j?.error?.message) friendly = mapApiError(res.status, j.error.message); } catch { /* ignore */ }
    throw new Error(friendly);
  }
  if (!res.body) throw new Error('响应体为空');
  return readSSE(res.body, p);
}

async function readSSE(body: ReadableStream<Uint8Array>, p: GenerateParams): Promise<string> {
  const reader = body.getReader();
  const dec = new TextDecoder('utf-8');
  let full = '', buf = '';
  eslint: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const ln of lines) {
      const t = ln.trim();
      if (!t || !t.startsWith('data:')) continue;
      const d = t.slice(5).trim();
      if (d === '[DONE]') break eslint;
      try {
        const j: SSEResp = JSON.parse(d);
        if (j.error?.message) throw new Error(mapApiError(400, j.error.message));
        const delta = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? '';
        if (delta) { full += delta; p.onDelta(delta); }
        if (j.choices?.[0]?.finish_reason === 'stop') break eslint;
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('生成失败')) throw e;
      }
    }
  }
  p.onDone(full);
  return full;
}

export async function validateKey(apiKey: string, baseUrl = DEFAULT_BASE_URL): Promise<{ ok: boolean; message: string }> {
  if (USE_BACKEND) return { ok: true, message: '后端代理模式' };
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: DEFAULT_MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5, stream: false }),
    });
    if (res.ok) return { ok: true, message: 'API Key 校验通过' };
    if (res.status === 401) return { ok: false, message: 'API Key 无效或已过期（401）' };
    if (res.status === 429) return { ok: false, message: '调用频率过高或额度用尽（429）' };
    if (res.status === 402) return { ok: false, message: '余额不足（402）' };
    return { ok: false, message: `校验失败（HTTP ${res.status}）` };
  } catch (e) {
    return { ok: false, message: `网络错误：${(e as Error).message}` };
  }
}

function mapApiError(status: number, raw: string): string {
  const lo = raw.toLowerCase();
  if (status === 401 || /invalid api key|authentication|unauthorized/.test(lo)) return '生成失败：API Key 无效，请检查「设置」页';
  if (status === 429 || /rate limit|quota/.test(lo)) return '生成失败：频率过高或额度用尽，稍后重试';
  if (status === 402 || /insufficient/.test(lo)) return '生成失败：账户余额不足';
  if (status === 400 && /context_length_exceeded/.test(lo)) return '生成失败：输入过长，请缩减原始文案';
  return `生成失败：${raw || `HTTP ${status}`}`;
}

function mapUpstream(status: number, raw?: string): string {
  if (status === 503) return '后端未配置 DEEPSEEK_API_KEY（503）';
  return raw ?? `后端返回 HTTP ${status}`;
}
