import { buildPrompt } from '@/prompts';
import type { CopyInput, GenerationConfig } from '@/types/copy';
import { DEFAULT_BASE_URL, DEFAULT_MODEL } from '@/constants/defaults';

// ----------------------------------------------------------------------
// 类型
// ----------------------------------------------------------------------

export interface GenerateParams {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  input: CopyInput;
  config: GenerationConfig;
  signal?: AbortSignal;
  /** 中间文本输出回调（用于流式展示） */
  onDelta: (delta: string) => void;
  /** 完成时回调，传入完整文本 */
  onDone: (fullText: string) => void;
  /** 错误回调 */
  onError: (err: Error) => void;
}

interface ChatCompletionResponse {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
  error?: { message?: string; type?: string; code?: string };
}

// ----------------------------------------------------------------------
// 核心：流式生成
// ----------------------------------------------------------------------

export async function generateStream(p: GenerateParams): Promise<string> {
  const baseUrl = (p.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = p.model ?? DEFAULT_MODEL;

  // 1️⃣ 构造 prompt
  const payload = buildPrompt(p.config.platformId, p.input, p.config);

  // 2️⃣ 发起流式请求
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: payload.system },
          ...payload.messages,
        ],
        temperature: p.config.temperature,
        stream: true,
      }),
      signal: p.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      // 用户主动中止不算错误
      return '';
    }
    throw new Error(`网络请求失败：${(e as Error).message}`);
  }

  // 3️⃣ HTTP 非 200：读取错误体
  if (!res.ok) {
    const errText = await res.text();
    let friendly = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) {
        friendly = mapApiError(res.status, errJson.error.message);
      }
    } catch {
      // 非 JSON 错误体，保持默认
    }
    throw new Error(friendly);
  }

  if (!res.body) throw new Error('响应体为空，可能是网络环境不支持流式（stream）');

  // 4️⃣ 逐行读取 SSE
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  eslint: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') break eslint;

      try {
        const json: ChatCompletionResponse = JSON.parse(data);
        // 业务错误
        if (json.error?.message) {
          throw new Error(mapApiError(400, json.error.message));
        }
        const delta = json.choices?.[0]?.delta?.content
          ?? json.choices?.[0]?.message?.content
          ?? '';
        if (delta) {
          fullText += delta;
          p.onDelta(delta);
        }
        if (json.choices?.[0]?.finish_reason === 'stop') {
          break eslint;
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('生成失败')) throw e;
        // JSON 解析失败：丢弃单条，继续
        continue;
      }
    }
  }

  p.onDone(fullText);
  return fullText;
}

// ----------------------------------------------------------------------
// Key 快速校验：发一条空白消息，看是否 401
// ----------------------------------------------------------------------

export async function validateKey(apiKey: string, baseUrl: string = DEFAULT_BASE_URL): Promise<{
  ok: boolean;
  message: string;
}> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
        stream: false,
      }),
    });
    if (res.ok) return { ok: true, message: 'API Key 校验通过' };
    if (res.status === 401) return { ok: false, message: 'API Key 无效或已过期（401）' };
    if (res.status === 429) return { ok: false, message: '调用频率过高或服务额度用尽（429）' };
    if (res.status === 402) return { ok: false, message: '账户余额不足（402）' };
    return { ok: false, message: `校验失败（HTTP ${res.status}）` };
  } catch (e) {
    return { ok: false, message: `网络错误：${(e as Error).message}` };
  }
}

// ----------------------------------------------------------------------
// 错误友好映射
// ----------------------------------------------------------------------

function mapApiError(status: number, raw: string): string {
  const lower = raw.toLowerCase();
  if (status === 401 || lower.includes('invalid api key') || lower.includes('authentication')) {
    return '生成失败：API Key 无效，请检查「设置」页的 key';
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('quota')) {
    return '生成失败：调用频率过高或用完了服务额度，稍后重试';
  }
  if (status === 402 || lower.includes('insufficient')) {
    return '生成失败：账户余额不足，请充值';
  }
  if (status === 400 && lower.includes('context_length_exceeded')) {
    return '生成失败：输入内容过长，请缩减原始文案';
  }
  return `生成失败：${raw || `HTTP ${status}`}`;
}
