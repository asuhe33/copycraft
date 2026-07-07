# CopyCraft · 多平台文案适配分发工具 MVP 计划

## Context

从 0 搭建一款面向国内新媒体运营/自媒体/电商卖家的纯前端 Web 应用。核心场景：输入一段产品描述或卖点，AI 按平台特性重写为适配的短文案，支持编辑、复制导出、历史留存。MVP 先锁定**小红书种草笔记**闭环，预留多平台扩展位。整体采用 **Vibe Coding** 模式：**每阶段产出均可运行、可验证**，大模块完成就暂停，确认后再推进。

- **产品名**：CopyCraft（文案魔匠）
- **技术栈**：React 18 + Vite 5 + TypeScript 5.5 + TailwindCSS 3 + React Router 6
- **AI 接入**：DeepSeek OpenAI-compatible 流式 API（前端直连，用户自携 API Key 存 localStorage）
- **UI 语言**：全中文
- **数据存储**：纯 localStorage，零后端

---

## Goal

4 个阶段跑通最小闭环：

1. **阶段 1** — 脚手架 + 基础框架（能启动、能路由、占位页面可见）
2. **阶段 2** — 核心输入 + 配置区（输入、平台选择、API Key 管理 闭环）
3. **阶段 3** — AI 调用 + 流式生成（接入 DeepSeek、流式输出、加载/错误状态）
4. **阶段 4** — 结果运营（编辑、复制、导出 / Markdown、历史 CRUD）⭐ MVP 交付

---

## Directory 结构（完整）

```
E:\x7345\first-cc\
├── index.html
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src\
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── types\
    │   ├── index.ts          # 类型 barrel 导出
    │   ├── platform.ts       # PlatformId 类型 + PlatformMetadata 接口
    │   └── copy.ts           # CopyInput / GenerationConfig / CopyResult
    ├── constants\
    │   ├── routes.ts
    │   ├── platforms.ts      # 平台静态数据
    │   └── defaults.ts       # 默认参数 + "deepseek-chat" 等
    ├── context\
    │   ├── index.ts
    │   ├── AppContext.tsx    # Provider + useAppContext
    │   └── appReducer.ts     # AppState / AppAction / reducer
    ├── api\
    │   └── deepseek.ts       # DeepSeek 流式调用 + Key 校验（阶段 3）
    ├── prompts\
    │   ├── index.ts          # buildPrompt(platform, input, config)
    │   └── xiaohongshu.ts    # 小红书 prompt 模板
    ├── hooks\
    │   ├── useGenerate.ts    # 流式生成 hook（阶段 3）
    │   ├── useCopy.ts        # 复制功能（阶段 4）
    │   └── useHistory.ts     # 历史记录 CRUD（阶段 4）
    ├── utils\
    │   ├── clipboard.ts      # 写入剪贴板
    │   ├── export.ts         # 导出 / Markdown
    │   └── crypto.ts         # Key 脱敏显示
    ├── components\
    │   ├── layout\
    │   │   ├── Header/       # Logo + 顶栏导航
    │   │   ├── Footer/       # 页脚
    │   │   └── PageContainer/ # 页面容器
    │   ├── atoms\            # 阶段 2
    │   │   ├── Button/
    │   │   ├── Textarea/
    │   │   ├── Select/
    │   │   ├── Input/
    │   │   ├── Toggle/
    │   │   └── Spinner/
    │   └── business\         # 阶段 2
    │       ├── CopyInputPanel/
    │       ├── PlatformPicker/
    │       ├── ConfigPanel/
    │       └── KeyManager/
    └── pages\
        ├── HomePage.tsx      # 主页三栏布局
        ├── HistoryPage.tsx   # 历史列表
        └── SettingsPage.tsx  # API Key 管理
```

---

## 第三方依赖清单（最小集）

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react` / `react-dom` | ^18.3 | 框架 |
| `react-router-dom` | ^6.26 | 路由 |
| `tailwindcss` / `postcss` / `autoprefixer` | ^3.4 | 样式 |
| `vite` | ^5.4 | 构建 |
| `@vitejs/plugin-react` | ^4.3 | React HMR |
| `typescript` | ^5.5 | 类型 |

> ⚠️ 不引入 Redx/Zustand，状态用 `useContext + useReducer`；复制用原生 Clipboard API；导出用单文件 Blob，无第三方库。

---

## 阶段交付计划

### 🟢 阶段 1 — 脚手架 + 基础框架（首批可动）

**产出文件**（约 20 个）：`package.json` / `vite.config.ts` / `tailwind.config.js` / `postcss.config.js` / `tsconfig.json` / `tsconfig.node.json` / `index.html` / `src/main.tsx` / `src/App.tsx` / `src/index.css` / `src/vite-env.d.ts` / `src/constants/routes.ts` / `src/constants/platforms.ts` / `src/constants/defaults.ts` / `src/types/platform.ts` / `src/types/copy.ts` / `src/types/index.ts` / `src/context/index.ts` / `src/context/AppContext.tsx` / `src/context/appReducer.ts` / `src/components/layout/Header/*` / `Footer/*` / `PageContainer/*` + 三个占位 Page。HomePage 用占位卡片占位（标注"阶段 2 实现"）。

**可运行效果（验证清单）**：

| # | 验证项 | 期望 |
|---|--------|------|
| 1 | 终端 `npm install && npm run dev` 无红报 | ✅ |
| 2 | 浏览器 `http://localhost:5173` 渲染 | ✅ |
| 3 | 顶栏显示 `✨ CopyCraft · 文案魔匠` + 三标签 | ✅ |
| 4 | 标签「生成/历史/设置」可跳转 | ✅ |
| 5 | 首页三栏占位卡片（输入/配置/结果）| ✅ |
| 6 | 控制台无 error | ✅ |
| 7 | 窗口缩放，响应式生效 | ✅ |

---

### 🟡 阶段 2 — 核心输入 + 配置区

**新建文件**：`components/atoms/{Button,Textarea,Select,Input,Toggle,Spinner}/*` + `components/business/{CopyInputPanel,PlatformPicker,ConfigPanel,KeyManager}/*` + 重写 `SettingsPage`。

**可运行效果**：输入文案 → 选择小红书 → 调语气/温度/长度 → 管理 API Key（校验/脱敏显示/保存到 localStorage）→ 按「生成」按钮时 UI 校验通过。

> ⚠️ 此阶段**不接入真实 AI**，点生成只 emit 校验成功日志，为阶段 3 留口子。

---

### 🔵 阶段 3 — AI 调用 + 流式生成

**新建文件**：`api/deepseek.ts` / `prompts/{index.ts,xiaohongshu.ts}` / `hooks/useGenerate.ts` / `components/business/ResultCard/*` / `ResultList/*`。

**可运行效果**：有合法 Key 后点「生成」，流式写出文案（打字机效果），可中止；无 Key / Key 失效显示红色错误态；生成中显示 Spinner。

---

### 🟣 阶段 4 — 结果运营（MVP 交付）

**新建文件**：`hooks/{useCopy.ts,useHistory.ts}` / `utils/{clipboard.ts,export.ts,crypto.ts}` / 重写 `HistoryPage`。

**可运行效果**：编辑生成结果 → 一键复制到剪贴板 → 导出单条 Markdown / 导出全文 → 历史列表（localStorage 持久化）→ 删除/置顶。

---

## 预留扩展（暂不实现）

- 多平台选择 UI 已占位（微博/抖音/公众号 `enabled:false`），后续只需写 prompt 模块 + 在 platforms.ts 开启 `enabled`。
- 用户体系：当前纯本地，服务端可把 history/context 抽象到 `/api/*`。
- 模板系统：`prompts/` 在设计上已是 per-platform 扩展模式。
- 热门话题抓取：可追加 hook 调用外部接口注入 `#tag`。

---

## Verification（阶段 1 结束时）

```bash
cd E:\x7345\first-cc
npm install          # 装依赖
npm run dev          # 启动开发服务器
```

打开浏览器 `http://localhost:5173`，顺序验证上方 7 条清单：编译通过 → 顶栏/导航 → 三栏占位卡片 → 路由跳转 → 控制台清空 → 窗口缩放。全部通过即为阶段 1 完成，等待你确认后再推进阶段 2。

---

## 阶段 1 启动指令（交给 Claude Code）

> 你先按上面的产出文件清单一次性创建全部脚手架文件，每个文件直接从本 Plan 引用的设计图中开写，不要改动产品名、技术栈、AI 接入方。创建完 `package.json` 后立刻 `npm install`，然后 `npm run dev` 看启动是否成功。
