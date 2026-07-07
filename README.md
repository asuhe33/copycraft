# ✨ CopyCraft · 文案魔匠 v1.0.0（MVP）

> 多平台文案适配分发工具 · 项目全功能交付包

一句话：你输入产品信息，AI 按平台特性重写为适配的易传播短文案，可编辑 / 复制 / 导出 Markdown / 历史留存。

---

## ✨ 当前 MVP 闭环

| 阶段 | 能力 | 完成 |
|------|------|------|
| 阶段 1 | 脚手架 + 基础框架 | ✅ |
| 阶段 2 | 核心输入 + 平台选择 + Key 管理 | ✅ |
| 阶段 3 | DeepSeek 流式生成 + 中止 + 错误态 | ✅ |
| 阶段 4 | 历史记录持久化 + 导出 Markdown + 历史 CRUD | ✅ |

---

## 🏗️ 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + Vite 5 + TypeScript 5.5 |
| 样式 | TailwindCSS 3 + PostCSS + Autoprefixer |
| 路由 | React Router 6（Hash Router，静态托管友好）|
| 状态 | `useContext` + `useReducer` |
| AI | DeepSeek `deepseek-chat`（OpenAI-compatible 流式 SSE）|
| 存储 | `localStorage`（Key 脱敏、历史持久化）|
| 部署 | 零后端 / 纯静态产物（`dist/`）|

---

## 🚀 快速开始

### 1. 装依赖

```bash
npm install
```

**要求**：Node.js ≥ 18，npm ≥ 9。

### 2. 启动开发服务器

```bash
npm run dev
```

打开 <http://localhost:5173>。

### 3. 生产构建

```bash
npm run build
```

产物在 `dist/`，可静态托管到 Vercel / Netlify / Cloudflare Pages / 国内 CDN。

### 4. 本地预览构建产物

```bash
npm run preview
```

---

## 🔑 申领 DeepSeek Key

1. 前往 <https://platform.deepseek.com/api_keys> 注册 / 登录。
2. 创建 API Key（格式 `sk-...`）。
3. 返回本工具 → 「设置」→ 粘贴 Key → 点「保存并校验」。
4. 看到 **✓ 校验通过** 即可使用。

> ⚠️ Key 仅保存在浏览器的 localStorage 中，不外传。如有隐私顾虑，可在「设置」中随时清除。

---

## 📖 四步跑通闭环

1. **「设置」页** → 保存 DeepSeek Key → ✓ 校验通过
2. **「生成」页** → 左栏填文案 → 中栏选平台 / 调配置 → 点「🚀 生成文案」
3. **结果卡片** → 流式逐字展示 → 完成后可 ✏️ 编辑 / 📋 复制 / ⬇️ 导出 MD / ⬇️ 导出 TXT / 🗑 删除
4. **「历史」页** → 关键词搜索 / 平台筛选 / 复制全部 / 导出 MD / 清空全部

刷新浏览器，历史记录仍在（localStorage 持久化）。

---

## 📂 目录结构

```
copycraft-mvp-v1.0.0/
├── deployment/            # 部署脚本与指引
├── dist/                  # 生产构建产物（已预构建）
├── docs/                  # 设计文档 / 进度报告存放处
├── src/                   # 完整源代码
│   ├── api/               # DeepSeek 流式调用封装
│   ├── components/
│   │   ├── atoms/         # 原子组件（Button/Input/Select/…）
│   │   ├── business/      # 业务组件（ResultCard/…）
│   │   └── layout/        # 布局组件（Header/Footer/PageContainer）
│   ├── constants/         # 路由、平台、默认参数
│   ├── context/           # AppContext + reducer
│   ├── hooks/             # useGenerate / useCopy / useHistory
│   ├── pages/             # HomePage / HistoryPage / SettingsPage
│   ├── prompts/           # 平台 prompt 模板（按平台扩写）
│   ├── types/             # 类型定义
│   └── utils/             # 导出 / 剪贴板 / 本地存储
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── README.md
```

---

## 🎨 设计风格

- 品牌色：小红书品牌红 `#ff4d6d`（`brand-500`）
- 中文字体栈：PingFang SC / Microsoft YaHei / system-ui
- 亮色 / 暗色双模式（`class` 策略，跟随系统）
- 全站响应式，移动端 / 桌面端自适应

---

## 🔒 隐私与安全

- **零后端**：不向任何第三方服务器传输你的文案或 Key。
- **本地 Key**：仅保存在浏览器 `localStorage` 中，以脱敏形式显示（`sk-a***7890`）。
- **数据上限**：历史最多保留 100 条，达到上限后自动丢弃最早的记录。

---

## 🛠️ 后续可扩展方向

- **多平台**：在 `src/prompts/` 新增 `weibo.ts` / `douyin.ts`，并在 `src/constants/platforms.ts` 中把对应平台的 `enabled` 改为 `true`。
- **模板系统**：保存常用输入组合为模板，一键填充。
- **服务端同步**：将 Key / 历史搬到后端，支持跨设备同步。
- **热门话题**：对接第三方热搜 API，自动注入话题标签。
- **PWA**：免安装、离线可用。

---

## 📄 协议

MVP 演示版 · 仅作产品原型验证使用。请勿输入 PII 等敏感信息。

---

*Crafted with Vibe Coding 🚀*
*CopyCraft © 2026*
