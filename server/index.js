/**
 * CopyCraft 轻量后端 — DeepSeek 代理 + 健康检查
 *
 * 用途：
 *   1. 代理 DeepSeek 请求（隐藏 API Key，避免前端暴露）
 *   2. 健康检查（监控服务状态）
 *   3. 未来可扩展：用户系统、历史云同步、调用限流
 *
 * 启动：
 *   npm run server          # 开发模式（需先 npm install express cors）
 *   PORT=3001 npm run server
 *
 * 环境变量：
 *   DEEPSEEK_API_KEY        # 后端代理用的 Key（可选，不设则前端直连）
 *   DEEPSEEK_BASE_URL       # 默认 https://api.deepseek.com/v1
 *   PORT                    # 默认 3001
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'copycraft-backend',
    time: new Date().toISOString(),
    deepseek: DEEPSEEK_API_KEY ? 'configured' : 'not-configured',
  });
});

// DeepSeek 代理（流式 + 非流式）
app.post('/api/generate', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(503).json({
      error: { message: '后端未配置 DEEPSEEK_API_KEY，请在前端「设置」页直接配置 Key' },
    });
  }

  const { messages, model, temperature, stream } = req.body;

  try {
    const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: temperature ?? 0.7,
        stream: !!stream,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: { message: errText } });
    }

    // 流式：直接 pipe 到前端
    if (stream && upstream.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        // 客户端断开
      } finally {
        res.end();
      }
      return;
    }

    // 非流式：返回完整 JSON
    const data = await upstream.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: { message: `代理失败: ${e.message}` } });
  }
});

app.listen(PORT, () => {
  console.log(`[CopyCraft] 后端已启动: http://localhost:${PORT}`);
  console.log(`[CopyCraft] DeepSeek: ${DEEPSEEK_API_KEY ? '已配置' : '未配置（前端直连模式）'}`);
  console.log(`[CopyCraft] 健康检查: http://localhost:${PORT}/api/health`);
});
