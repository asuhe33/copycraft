# CLAUDE.md — CopyCraft 项目开发上下文

> 本文件是 Claude Code 的项目协作上下文。用户在新对话中说"继续开发"时，Claude 应先读取本文件恢复上下文。

---

## 1. 产品定位

**CopyCraft · 文案魔匠** — 多平台文案适配分发工具

- 用户输入产品描述/卖点 → AI 按平台特性（小红书/微博/抖音/公众号）重写为易传播的短文案
- 支持编辑 / 复制 / 导出 Markdown / 跨设备同步历史
- MVP 阶段聚焦**小红书种草闭环**，其他平台 prompt 已写好、UI 留占位
- **PWA 已上线**：手机可"添加到主屏幕"，PC 可安装为独立窗口应用

## 2. 线上地址 & 仓库

| 资源 | URL |
|------|-----|
| **线上应用（PWA）** | https://asuhe33.github.io/copycraft |
| **GitHub 仓库** | https://github.com/asuhe33/copycraft |
| **本地目录** | `E:\x7345\copycraft-mvp-v1.0.0` |
| **默认分支** | `main` |
| **Git Remote** | SSH `git@github.com:asuhe33/copycraft.git`（HTTPS 会被网络环境拦截，必须用 SSH）|

## 3. 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + Vite 5 + TypeScript 5.5 |
| 样式 | TailwindCSS 3 + PostCSS + Autoprefixer |
| 路由 | React Router 6（**HashRouter**，静态托管友好）|
| 状态 | useContext + useReducer |
| AI | DeepSeek `deepseek-chat`（OpenAI-compatible 流式 SSE）|
| 前端存储 | localStorage（Key 脱敏、历史最多 100 条）|
| 后端（框架已搭）| Express + CORS（可选启用）|
| 部署 | GitHub Pages via GitHub Actions workflow |

## 4. 已完成功能

### 阶段 1 ✅ 脚手架 + 基础框架
### 阶段 2 ✅ 核心输入 + 平台选择 + Key 管理
### 阶段 3 ✅ DeepSeek 流式生成 + 中止 + 错误态
### 阶段 4 ✅ 历史记录持久化 + 导出 Markdown + 历史 CRUD
### 阶段 5 ✅ PWA 落地 + 后端代理框架 + 多平台 Prompt 空间

#### PWA 关键实现
- `manifest.webmanifest`：全屏独立运行 + 主屏幕图标
- `public/sw.js`：Service Worker v2（离线缓存 + 旧缓存清理）
- `main.tsx`：错误边界（渲染异常不白屏 + 一键清缓存按钮）
- `vite.config.ts`：`base: './'`（相对路径，部署到子路径不 404）

#### 多平台 Prompt（已写 4 个，UI 仅开放小红书）
```
src/prompts/
├── index.ts              ← 4 平台 switch 分支完整
├── xiaohongshu.ts        ← ✅ UI 已开放
├── weibo.ts              ← 🚧 UI 未开放（enabled: false）
├── douyin.ts             ← 🚧 UI 未开放
└── gongzhonghao.ts       ← 🚧 UI 未开放
```
启用新平台：`constants/platforms.ts` 改 `enabled: true` + `PlatformPicker` 的 `iconMap` 加 emoji。

#### 账户 & 跨设备同步后端（已上线 MVP）
- `server/`：改用 **ESM**（`package.json` type=module）+ `node:sqlite`（Node 22+，启动需 `--experimental-sqlite`）
  - `db.js`：sqlite 单文件 DB，表 `users` / `sessions` / `verify_codes` / `history`（联合主键 id+user_id）
  - `crypto.js`：scrypt 密码哈希 + AES-256-GCM 加密 API Key + HMAC-SHA256 自签 session token
  - `routes/auth.js`：邮箱 + 6 位数字验证码注册/登录（DEV 模式接口直返验证码）
  - `routes/sync.js`：历史 + 设置双向同步（`updated_at` 毫秒时间戳**最后写入胜出**，一次往返全双工）
  - `routes/account.js`：me + 删库跑路
  - `middleware.js`：`authenticate` 中间件查 sessions 表 + 吊销过期 session
  - `index.js`：挂载 3 套路由 + `/api/generate` 优先读用户托管 Key（AES 解密）
- 前端：
  - `src/auth/AuthContext.tsx`：token 持久化 + `fetchWithAuth` 401 自动登出 + 启动刷新 me
  - `src/api/auth.ts` + `api/sync.ts`：网络层
  - `src/hooks/useSync.ts`：订阅 history 变更事件 → debounce 推送 + 登录首启全量 + visibilitychange 拉一次
  - `src/hooks/useHistory.ts`：add/update/remove 发出 module-level 事件（与 useSync 解耦）
  - `src/components/business/auth/LoginForm.tsx`：邮箱 + 验证码 + 密码（MVP dev 弹窗显示验证码）
  - `pages/SettingsPage.tsx`："账户与同步"区块（托管 API Key / 同步状态 / 立即同步 / 登出 / 删库）
  - `vite.config.ts`：`/api` proxy → `localhost:3001`
  - `src/types/copy.ts`：加 `updatedAt?: number`
- 后端要求的环境变量：`JWT_SECRET`（必填）/ `DB_PATH` / `VERIFY_CODE_TTL` / `SESSION_TTL`
- 测试脚本：`scripts/e2e-backend.mjs`（16 项后端检查）/ `scripts/e2e-full.mjs`（含注册→删库）
```
npm run server                              # 起后端（3001 端口，已加 --experimental-sqlite）
npm run dev                                 # 起前端（5173，会自动 proxy /api → 3001）
JWT_SECRET=x npm run server                  # 最简启动
VITE_USE_BACKEND=true npm run dev            # 前端走后端代理（否则前端直连 DeepSeek）
```
> 初始化数据库：第一次启动时自动建表 + mkdir server/data；生产数据在 `server/data/copycraft.db`（已 gitignore）

## 5. 目录结构

```
copycraft-mvp-v1.0.0/
├── .github/workflows/deploy.yml  ← Pages 自动部署（push main 触发）
├── scripts/                      ← 联调脚本
│   ├── e2e-backend.mjs           ← 后端 16 项全链路检查
│   └── e2e-full.mjs              ← 注册→托管 Key→同步→删库完整流
├── server/                       ← 后端（Express + node:sqlite，ESM）
│   ├── index.js                  ← 入口：挂载 + /api/generate Key 优先级
│   ├── db.js                     ← sqlite schema + CRUD
│   ├── crypto.js                 ← scrypt + AES-256-GCM + HMAC token
│   ├── mailer.js                 ← DEV 模式返回验证码（PROD 扩展位）
│   ├── middleware.js             ← authenticate 中间件
│   ├── routes/                   ← auth / sync / account
│   └── data/                     ← 运行时 sqlite DB（gitignore）
├── public/
│   ├── sw.js                     ← Service Worker v2
│   ├── manifest.webmanifest      ← PWA 主配置
│   └── icons/icon.svg            ← PWA 图标
├── src/
│   ├── api/deepseek.ts           ← 流式生成 + Key 校验（含后端代理分支）
│   ├── api/                      ← auth/sync 网络层
│   ├── auth/                     ← AuthContext（token/me/refetchMe）
│   ├── components/
│   │   ├── atoms/                ← Button/Input/Select/Textarea/Toggle/Spinner
│   │   ├── business/             ← ResultCard/ResultList/CopyInputPanel/PlatformPicker/ConfigPanel/KeyManager/auth/LoginForm
│   │   └── layout/               ← Header/Footer/PageContainer
│   ├── constants/                ← routes/platforms/defaults
│   ├── context/                  ← AppContext + appReducer
│   ├── hooks/                    ← useGenerate/useCopy/useHistory/useSync
│   ├── pages/                    ← HomePage/HistoryPage/SettingsPage
│   ├── prompts/                  ← index(工厂) + 4 平台模板
│   ├── types/                    ← platform/copy
│   └── utils/                    ← export/crypto
├── CLAUDE.md                     # 本文件
├── vite.config.ts                ← base:'./'，避免子路径资源 404
└── package.json                  ← 含 express/cors 后端依赖
```

## 6. 关键约定（必读）

### 6.1 文件写入 ⚠️ 高危
- **Write 工具会写到错误路径** `C:\Users\x7345\first-cc`（已在 .gitignore 忽略）
- **项目真实路径** `E:\x7345\copycraft-mvp-v1.0.0`
- **源文件写入唯一正确方式**：
  - **Bash heredoc 仅用于 20 行以内的单文件**
  - **超过 50 行的文件用 Python 脚本**：写一个 `.py` 脚本调用 `pathlib.Path().write_text()`，执行完后删除脚本
  - **Read 工具会缓存旧版本**，文件写入后永远不要用 Read 验证，用 Bash `head`/`grep` 验证
- Bash 的 Shell cwd 会莫名回到 `E:\x7345\first-cc`，所有 git/命令必须先 `cd E:/x7345\copycraft-mvp-v1.0.0`

### 6.2 Git 工作流
```bash
cd E:/x7345\copycraft-mvp-v1.0.0
git add -A
git commit -m "feat/fix: xxx"
git push origin main          # SSH，不要用 HTTPS
```
- gh 登录用户：asuhe33（SSH key: `~/.ssh/id_ed25519`）
- HTTPS push 会被网络环境拦截（TCP 21s 超时），必须用 SSH

### 6.3 Code Style
- 组件用 `function` 声明
- Props 接口用 `interface`
- Tailwind class 优先，少写独立 CSS
- 中文 UI，注释优先中文
- Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:`
- tsc 用 `./node_modules/.bin/tsc --noEmit`（不是 `npx tsc`，npx 会装错包）

### 6.4 AI 接入配置
- Provider: DeepSeek ONLY
- 模型: `deepseek-chat`
- 前端 Key location: localStorage，key=`copycraft_api_key`
- 历史 key: `copycraft_history`（最多 100 条）
- Key 脱敏: 保留前 4 + 后 4，中间 `***`

### 6.5 PWA 部署坑（已踩过）
1. GitHub API 开启 Pages 后 `build_type=workflow` 但可能残留旧 `source.branch` 配置 → 导致 `deploy-pages@v4` 报 404
   - 修复：`gh api -X PUT repos/asuhe33/copycraft/pages -f "build_type=workflow"`
2. Service Worker 缓存旧版本 → 白屏。每次修 SW 必须改 `CACHE_NAME` 版本号
3. `base: './'` 必须设，否则子路径部署资源引用错位

### 6.6 Vibe Coding 节奏
- 每完成一个大模块自动暂停等用户确认
- 每阶段结束跑 `tsc` + `build` 都通过后给用户 7 条自检清单
- 不堆砌冗余功能

## 7. 已知待修 / 用户反馈的问题

- **刷新页面后历史丢失**：某些手机浏览器（iOS Safari 7 天自动清理）会清 localStorage；长期方案需要后端 + 数据库跨设备同步
- **导出到指定目录**：已实现 File System Access API（PC Chrome/Edge PWA 体验佳，Safari 降级为传统下载）
- **用户跨设备同步需求**：确认需要后端，尚未实现

## 8. 下一步候选（待用户选择）

按产品价值排序：

1. ~~**跨设备历史同步后端**~~ ← ✅ 已完成（邮箱 + JWT session + node:sqlite + 最后写入胜出）
2. ~~**多平台扩写 UI 开放**~~ ← ✅ 已完成（微博/抖音/公众号 enabled:true，复用 deepseek-chat）
3. **邮件通道 PROD 化**（mailer.js 接 Resend/OTP；settings 中加"email verify/改绑"）
4. **历史软删同步闭环**（当前 remove 是本地硬删，需补 `deleted` payload 让服务端也软删以免重生）
5. **模板系统**（保存常用输入组合为可复用模板，与 history 表联合托管）
6. **Key 跨端 E2E 加密**（当前同 session 发明文，多设备应走端到端加密）
7. **公网部署**（Render/Fly.io/自有 VPS；JWT_SECRET 必须独立；DB 定期备份）
8. **模板系统**（保存常用输入组合）
9. **导出/导入历史备份文件**（零后端，手动迁移，轻量过渡方案）
10. **桌面 EXE 打包**（Tauri，~10MB）
11. **Android APK**（Capacitor）

## 9. 调试命令速查

```bash
cd E:/x7345\copycraft-mvp-v1.0.0

# 类型检查 + 构建
./node_modules/.bin/tsc --noEmit
npm run build

# 开发
npm run dev                # 前端直连 DeepSeek（用户自备 Key）
npm run server             # 后端代理（可选）
npm run dev:full           # 同时启后端 + 前端
VITE_USE_BACKEND=true npm run dev   # 前端走后端

# GitHub Actions 状态
gh run list --limit 3
gh run view <id> --log-failed

# Pages 状态
gh api repos/asuhe33/copycraft/pages
curl -sI https://asuhe33.github.io/copycraft/

# 清缓存 + 重启
npm ci                     # 重装依赖
rm -rf node_modules/.vite  # 清 vite 缓存
```
