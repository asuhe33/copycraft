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

#### 账户 & 跨设备同步后端（MySQL 8.0，MVP 已上线）
- `server/`：**ESM**（`package.json` type=module）+ **mysql2/promise** 连接池（**原 node:sqlite 已移除**）
  - `db.js`：MySQL 异步 API，导出签名与 sqlite 版一致（下游零改）
    - history 联合主键 `(user_id, history_id)`；INSERT ... ON DUPLICATE KEY UPDATE + `VALUES(updated_at) >=` 条件 → **最后写入胜出**
    - deleteUserCascade 用事务 + FK `ON DELETE CASCADE`
  - `db_init.sql`：`CREATE DATABASE copycraft` + 4 业务表 DDL（InnoDB/utf8mb4）
  - `db_init.js`：一键跑 db_init.sql 的脚本（`npm run db:init`）
  - `crypto.js`：scrypt + AES-256-GCM + HMAC-SHA256 session token
  - `routes/auth.js`：邮箱 + 6 位数字验证码注册/登录（DEV 模式接口直返验证码，详见 `.env.example`）
  - `routes/sync.js`：历史 + 设置双向同步（一次往返全双工）
  - `routes/account.js`：me + 删库
  - `middleware.js`：查 sessions 表 + 吊销过期 session
  - `index.js`：挂载 + 启动 DB warm-up + 可选 `DB_INIT_BEFORE_BOOT=1` + `/api/generate` Key 优先级分支
- 前端：
  - `src/auth/AuthContext.tsx` / `src/api/auth.ts` + `api/sync.ts`
  - `src/hooks/useSync.ts`：订阅 history 变更事件 → debounce 推送 + 登录首启全量 + visibilitychange
  - `src/hooks/useHistory.ts`：add/update/remove 发 module-level 事件
  - `src/components/business/auth/LoginForm.tsx`：邮箱+验证码+密码（MVP dev 弹窗显示验证码）
  - `pages/SettingsPage.tsx`："账户与同步"区块（云 Key 托管/同步状态/登出/删库）
  - `vite.config.ts`：`/api` proxy → `localhost:3001`
  - `src/types/copy.ts`：加 `updatedAt?: number`
- 连接配置（环境变量 / `.env`，`.env.example` 含完整引导）：
  - `JWT_SECRET`（**必填**，>=32 位随机串）
  - `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
  - `VERIFY_CODE_TTL` / `SESSION_TTL` / `DB_INIT_BEFORE_BOOT`（可选）
- 测试脚本：`scripts/e2e-mysql.mjs`（MySQL 9/9 PASS，**已实测用户本机 root@3307**）
```
npm run db:init                                # 一次性建库+建表（DB_PASSWORD=123456 npm run db:init）
npm run server                                 # 起后端（3001 端口；已去掉 --experimental-sqlite）
npm run dev                                    # 起前端（5173，/api → 3001）
DB_INIT_BEFORE_BOOT=1 npm run server            # 首次：自动建库 + 起服务
JWT_SECRET=$(openssl rand -hex 32) npm run server  # 生成强 secret 启动
```
> 配置：复制 `.env.example` 为 `.env` 填入 MySQL 连接信息；已通过 127.0.0.1:3307 用户真实 MySQL 联调验证

## 5. 目录结构

```
copycraft-mvp-v1.0.0/
├── .github/workflows/deploy.yml  ← Pages 自动部署（push main 触发）
├── scripts/                      ← 联调脚本
│   ├── e2e-mysql.mjs             ← MySQL 9/9 全链路（已实测用户本机 3307）
│   ├── e2e-backend.mjs           ← 后端 16 项全链路检查（sqlite 版，保留）
│   └── e2e-full.mjs              ← 注册→托管 Key→同步→删库完整流（sqlite 版，保留）
├── server/                       ← 后端（Express + mysql2 连接池，ESM）
│   ├── index.js                  ← 入口：挂载 + DB warmup + /api/generate Key 优先级
│   ├── db.js                     ← mysql2/promise 异步 API（签名与 sqlite 版完全一致）
│   ├── db_init.sql               ← 4 业务表 DDL（InnoDB/utf8mb4；首次部署用）
│   ├── db_init.js                ← 一键 schema 部署脚本（npm run db:init）
│   ├── crypto.js                 ← scrypt + AES-256-GCM + HMAC token
│   ├── mailer.js                 ← DEV 模式返回验证码（PROD 扩展位）
│   ├── middleware.js             ← authenticate 中间件（session 表可吊销）
│   └── routes/                   ← auth / sync / account
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

### 6.7 自动版本管理（强制约定 — Claude 每次完成任务必须执行）

> **核心原则**：每次完成需求/模块/bugfix，**立即进行 Git 本地提交 + 更新 CLAUDE.md**，不等用户提醒。

#### 触发时机（满足任一即执行）

- 用户说"完成"/"没问题"/"继续"/"提交"/"push"
- 跑完 `tsc + build` 自检全通过
- 独立任务结束（用户已经验收）或单一大功能拆出的子模块完成并测试通过

#### 自动执行步骤（Claude 按顺序执行）

```
1. 跑 tsc + build 确认本次改动未破坏构建
2. git add 本次涉及的文件（rm 不需要的编译产物：dist/ 等不提交）
3. git commit（遵循 Conventional Commit 规范）
4. 更新 CLAUDE.md（如有结构/架构/功能变化）：
   - 目录结构：新增/改动的文件
   - 已完成功能：第 4 节加 ✅ 标记
   - 下一步候选：第 8 节划掉已完成 + 新候选加入
   - 架构描述：技术栈变化同步反映
5. 告知用户 commit hash + 改了什么（如用户要求"自动"则静默执行）
```

#### Commit message 规范（沿用 Conventional Commits）

- `feat:` 新功能 / 新模块
- `fix:` bug 修复
- `refactor:` 重构（不改行为）
- `docs:` CLAUDE.md / 注释 / 文档
- `chore:` 构建 / 依赖 / 脚本
- `test:` 测试脚本
- 例：`feat: 从 node:sqlite 迁移到 MySQL 8.0`

#### 不提交到 Git 的内容（已在 .gitignore）

- `node_modules/`
- `dist/` （前端 GitHub Pages 部署物，由 Actions 生成）
- `server/data/` （旧 sqlite 运行时数据，已移除）
- `.env` / `*.local`
- 临时 e2e 脚本产物（如 `.e2e.db*`）

#### 远程推送

- **默认每次本地 commit 后立即 push origin main**（SSH，已验证不会被拦截）
- 除非用户明确说"本次不 push"
- 推送前跑一次 `git status` 确认没有不该提交的敏感文件

## 7. 已知待修 / 用户反馈的问题

- ~~**刷新页面后历史丢失**~~ ← ✅ 已通过 MySQL 云同步解决（MVP）
- ~~**跨设备同步需求**~~ ← ✅ 已实现（邮箱+JWT+MySQL 最后写入胜出）
- **导出到指定目录**：已实现 File System Access API（PC Chrome/Edge PWA 体验佳，Safari 降级为传统下载）

## 8. 下一步候选（待用户选择）

按产品价值排序：

1. ~~**跨设备历史同步后端**~~ ← ✅ 已完成（邮箱 + JWT session + MySQL 8.0 连接池 + 最后写入胜出）
2. ~~**多平台扩写 UI 开放**~~ ← ✅ 已完成（微博/抖音/公众号 enabled:true，复用 deepseek-chat）
3. ~~**后端迁移 MySQL 8.0**~~ ← ✅ 已完成（node:sqlite → mysql2，保留签名零破坏）
4. **邮件通道 PROD**（mailer.js 接 Resend/nodemailer，不再直返验证码）
5. **历史软删同步闭环**（当前 remove 是本地硬删，需补 `deleted` payload 让服务端也软删以免重生）
6. **Key 跨端 E2E 加密**（当前同 session 发明文，多设备应走端到端加密）
7. **公网部署**（VPS / Render / Fly.io；JWT_SECRET 必须独立；DB 定期备份）
8. **模板系统**（保存常用输入组合，与 history 表联合托管）
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
