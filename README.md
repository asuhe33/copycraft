# ✨ CopyCraft · 文案魔匠 v1.0.1

> 多平台文案适配分发工具 · 桌面单机版 + PWA + 可选后端同步

一句话：你输入产品信息，AI 按平台特性重写为适配的易传播短文案，可编辑 / 复制 / 导出 Markdown / 历史留存 / 跨设备同步。

---

## ✨ 当前 MVP 闭环

| 阶段 | 能力 | 完成 |
|------|------|------|
| 阶段 1 | 脚手架 + 基础框架 | ✅ |
| 阶段 2 | 核心输入 + 平台选择 + Key 管理 | ✅ |
| 阶段 3 | DeepSeek 流式生成 + 中止 + 错误态 | ✅ |
| 阶段 4 | 历史记录持久化 + 导出 Markdown + 历史 CRUD | ✅ |
| 阶段 5 | PWA 落地 + 后端代理框架 + 多平台 Prompt 空间 | ✅ |
| 阶段 6 | 邮件通道 PROD + 安全加固 + 桌面单机版 | ✅ |

---

## 🏗️ 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + Vite 5 + TypeScript 5.5 |
| 样式 | TailwindCSS 3 + PostCSS + Autoprefixer |
| 路由 | React Router 6（Hash Router，静态托管友好）|
| 状态 | `useContext` + `useReducer` |
| AI | DeepSeek `deepseek-chat`（OpenAI-compatible 流式 SSE）|
| 桌面版 | Electron 34 + electron-builder（Windows portable）|
| 后端（可选）| Express + mysql2 连接池（ESM）|
| 邮件（可选）| nodemailer@8（SMTP + Resend 双后端）|
| 前端存储 | `localStorage`（Key 脱敏、历史最多 100 条）|
| 部署 | GitHub Pages via GitHub Actions workflow |

---

## 🚀 快速开始

### 1. 装依赖

```bash
npm install
```

**要求**：Node.js ≥ 18，npm ≥ 9。

### 2. 启动开发服务器（前端）

```bash
npm run dev
```

打开 <http://localhost:5173>。

### 3. 生产构建（PWA）

```bash
npm run build
```

产物在 `dist/`，可静态托管到 Vercel / Netlify / Cloudflare Pages / 国内 CDN。

### 4. 本地预览构建产物

```bash
npm run preview
```

### 5. 桌面单机版（Electron）

```bash
# 开发模式（需手动重启，无 HMR）
npm run electron:dev

# 打包（产物在 release/）
npm run electron:build
```

产物：
- `release/CopyCraft-1.0.1-win-portable.zip`（115MB，解压后双击 exe）
- `release/win-unpacked/CopyCraft.exe`（182MB 单文件）

> 桌面版无后端，同步/注册/云 Key UI 自动隐藏。用户自备 DeepSeek Key 直连。

### 6. 后端（可选，用于跨设备同步）

```bash
# 首次：建库建表
DB_PASSWORD=你的密码 npm run db:init

# 启动后端（3001 端口）
DB_PASSWORD=你的密码 npm run server

# 同时启前后端
DB_PASSWORD=你的密码 npm run dev:full
```

后端连接 MySQL 8.0+，配置见 `.env.example`。

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
├── .github/workflows/deploy.yml  ← Pages 自动部署（push main 触发）
├── docs/                        ← 设计文档 / 测试报告
│   └── TESTING.md               ← 完整测试文档（43/43 PASS）
├── electron/                    ← 桌面单机版主进程
│   ├── main.cjs                 ← Electron 入口（加载 dist/index.html）
│   └── preload.cjs              ← 安全桥梁（contextBridge）
├── electron-builder.yml         ← electron-builder 配置（Windows portable）
├── public/                      ← PWA 静态资源
│   ├── sw.js                    ← Service Worker v2
│   ├── manifest.webmanifest     ← PWA 主配置
│   └── icons/                   ← PWA 图标
├── scripts/                     ← 联调脚本
│   ├── e2e-mailer.mjs           ← 邮件通道 4/4 PASS
│   ├── e2e-mysql.mjs            ← MySQL 9 全链路 9/9 PASS
│   ├── e2e-auth-mailer.mjs      ← Auth+Mailer 集成 5/5 PASS
│   └── package-desktop-zip.ps1  ← win-unpacked → zip 打包
├── server/                      ← 后端（Express + mysql2，ESM）
│   ├── index.js                 ← 入口：挂载 + DB warmup + /api/generate
│   ├── db.js                    ← mysql2/promise 异步 API
│   ├── db_init.sql              ← 4 业务表 DDL（InnoDB/utf8mb4）
│   ├── crypto.js                ← scrypt + AES-256-GCM + HMAC + HKDF
│   ├── mailer.js                ← nodemailer@8（SMTP + Resend 双后端）
│   ├── middleware.js            ← authenticate 中间件（session 吊销）
│   └── routes/                  ← auth / sync / account
├── src/                         ← 前端源码
│   ├── api/                     ← deepseek / auth / sync 网络层
│   ├── auth/                    ← AuthContext（token/me/refetchMe）
│   ├── components/
│   │   ├── atoms/               ← Button/Input/Select/Textarea/Toggle/Spinner
│   │   ├── business/            ← ResultCard/ResultList/CopyInputPanel/PlatformPicker/ConfigPanel/KeyManager/auth/LoginForm
│   │   └── layout/              ← Header/Footer/PageContainer
│   ├── constants/               ← routes/platforms/defaults
│   ├── context/                 ← AppContext + appReducer
│   ├── hooks/                   ← useGenerate/useCopy/useHistory/useSync
│   ├── pages/                   ← HomePage/HistoryPage/SettingsPage
│   ├── prompts/                 ← index(工厂) + 4 平台模板
│   ├── types/                   ← platform/copy
│   └── utils/                   ← export/crypto
├── CLAUDE.md                    ← Claude Code 协作上下文
├── vite.config.ts               ← base:'./'，/api proxy → 3001
└── package.json                 ← 含 express/cors/electron/nodemailer 依赖
```

---

## 🎨 设计风格

- 品牌色：小红书品牌红 `#ff4d6d`（`brand-500`）
- 中文字体栈：PingFang SC / Microsoft YaHei / system-ui
- 亮色 / 暗色双模式（`class` 策略，跟随系统）
- 全站响应式，移动端 / 桌面端自适应

---

## 🔒 隐私与安全

### 前端（PWA / 桌面版）
- **零后端**：PWA 模式不向任何第三方服务器传输你的文案或 Key。
- **本地 Key**：仅保存在浏览器 `localStorage` 中，以脱敏形式显示（`sk-a***7890`）。
- **数据上限**：历史最多保留 100 条，达到上限后自动丢弃最早的记录。

### 后端（可选）
- **密码**：scrypt N=16384 + timingSafeEqual 防时序
- **会话**：HMAC-SHA256 token + DB 吊销 + SESSION_TTL（默认 30 天）
- **API Key 托管**：AES-256-GCM 独立 IV + HKDF-SHA256 派生根密钥
- **CORS**：origin 函数白名单（默认 localhost + tauri://localhost）
- **防 email 枚举**：`/request-code` 不区分账户是否存在
- **验证码**：60s 节流 + 错误 5 次失效 + TTL 600s
- **SSRF 防御**：`DEEPSEEK_BASE_URL` 强制 https://
- **日志脱敏**：验证码不进日志；email 仅 DEBUG=1 下输出 hash

### 依赖漏洞（2026-07-08 审计）
- 0 CRITICAL / 0 HIGH 实际可利用漏洞
- esbuild moderate（仅 dev server，不影响构建产线）
- nodemailer 2 高危（利用路径在本项目不触发）

详见 [docs/TESTING.md](docs/TESTING.md)。

---

## 🛠️ 后续可扩展方向

按产品价值排序：

1. **历史软删同步闭环**（当前 remove 是本地硬删，需补 `deleted` payload 让服务端也软删以免重生）
2. **Key 跨端 E2E 加密**（当前同 session 发明文，多设备应走端到端加密）
3. **公网部署**（VPS / Render / Fly.io；JWT_SECRET 必须独立；DB 定期备份）
4. **模板系统**（保存常用输入组合，与 history 表联合托管）
5. **导出/导入历史备份文件**（零后端，手动迁移，轻量过渡方案）
6. **Tauri 迁移**（Electron → Tauri v8，~5MB；待 v8 文档可访问后）
7. **Android APK**（Capacitor）

---

## 📊 测试覆盖

| 套件 | 用例 | 结果 |
|------|------|------|
| mailer E2E | 4 | ✅ PASS |
| MySQL 全链路 | 9 | ✅ PASS |
| auth+mailer 集成 | 5 | ✅ PASS |
| tsc + vite build | 85 modules | ✅ PASS |
| 桌面版冒烟 | 2 | ✅ PASS |
| 安全审计 | 14 项 | ✅ 0 CRITICAL / 0 HIGH |

**总计：43/43 PASS**

详见 [docs/TESTING.md](docs/TESTING.md)。

---

## 📜 版本历史

| 版本 | 日期 | 关键变更 |
|------|------|---------|
| 1.0.1 | 2026-07-08 | 邮件通道 PROD、桌面单机版（Electron 34）、安全加固（CORS/枚举/HKDF/SSRF/限长/脱敏）、测试文档 |
| 1.0.0 | 2026-07-06 | 脚手架 → 阶段 5 + 多平台 + MySQL 迁移（MVP 上线）|

---

## 📄 协议

MVP 演示版 · 仅作产品原型验证使用。请勿输入 PII 等敏感信息。

---

*Crafted with Vibe Coding 🚀*
*CopyCraft © 2026*
