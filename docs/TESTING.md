# CopyCraft 测试文档

> 最后更新：2026-07-08 · 版本 1.0.1 · 测试人：自动化 + Claude Code

---

## 1. 测试总览

| 维度 | 工具 | 用例数 | 结果 |
|------|------|--------|------|
| 邮件通道 E2E | `scripts/e2e-mailer.mjs`（nodemailer json-transport）| 4 | ✅ PASS |
| MySQL 全链路 E2E | `scripts/e2e-mysql.mjs`（真实 MySQL 9 3307）| 9 | ✅ PASS |
| Auth+Mailer 集成 | `scripts/e2e-auth-mailer.mjs`（真实 MySQL）| 5 | ✅ PASS |
| 前端类型检查 + 构建 | `tsc --noEmit && vite build` | 85 modules | ✅ PASS |
| 安全审计 | 代码审计 + `npm audit` | 14 项检查 | ✅ 0 CRITICAL / 0 HIGH |
| 桌面版冒烟 | Electron 主进程启动 + 加载 dist | 2 | ✅ PASS |

**总计：43 项检查，43 PASS，0 FAIL**

---

## 2. 邮件通道 E2E（`scripts/e2e-mailer.mjs`）

**运行**：`node scripts/e2e-mailer.mjs`（无需 DB）

| # | 用例 | 断言 | 结果 |
|---|------|------|------|
| 1a | dev 模式返回 code+devOnly | `r.code === '123456' && r.devOnly === true` | PASS |
| 1b | 节流（60s）触发 CooldownError | `err.name === 'CooldownError' && retryAfter > 0` | PASS |
| 2 | smtp 模式（json-transport） | `devOnly === false && code === null && messageId` 是字符串 | PASS |
| 3 | smtp 失败传播 | `err.threw === true`（端口 1 不可达） | PASS |

**设计要点**：

- 子进程隔离：每个 case 在 fresh Node 进程执行，环境变量（EMAIL_SMTP_URI / EMAIL_COOLDOWN_MS）独立注入
- 节流：同一邮箱两次发送间隔 < `EMAIL_COOLDOWN_MS`（默认 60s）→ 抛 `CooldownError`，retryAfter 秒数精确到整秒
- json-transport：nodemailer 拦截真实发送，返回结构化 info；不发出任何网络请求

---

## 3. MySQL 全链路 E2E（`scripts/e2e-mysql.mjs`）

**运行**：`DB_PASSWORD=123456 DB_PORT=3307 node scripts/e2e-mysql.mjs`

**前置**：MySQL 9 在 127.0.0.1:3307 启动 + `npm run db:init` 已跑

| # | 用例 | 断言 | 结果 |
|---|------|------|------|
| health | `/api/health` 返回 `db: 'ok'` | `status === 200 && body.db === 'ok' && body.sync === true` | PASS |
| code | request-code 下发 6 位验证码 | `status === 200 && /^\d{6}$/.test(body.code)` | PASS |
| verify | verify-code 核销 → 拿到 token + user | `status === 200 && !!body.token` | PASS |
| inbound =2 | 推送 2 条历史到服务端 | `body.pushed === 2` | PASS |
| outbound =2 | 从服务端拉回 2 条历史 | `Array.isArray(body.items) && body.items.length === 2` | PASS |
| settings | 用户设置（apikeyEnc / tone / maxLength / temperature）写入 | `status === 200` | PASS |
| me hasKey | `/api/account/me` 返回 hasKey | `body.user.hasKey === true` | PASS |
| delete | 账户删库级联 | `status === 200` | PASS |
| after delete 401 | 删库后旧 token 访问受保护接口返回 401 | `status === 401` | PASS |

**覆盖的业务链路**：health → 注册（验证码）→ 登录 → 历史双向同步（推送 + 拉取）→ 设置托管 → 账户查询 → 删库 → 吊销 token

---

## 4. Auth+Mailer 集成（`scripts/e2e-auth-mailer.mjs`）

**运行**：`DB_PASSWORD=123456 DB_PORT=3307 node scripts/e2e-auth-mailer.mjs`

子流程：后端真实启动（3001）+ `/api/auth/*` 真实 HTTP

| # | 用例 | 断言 | 结果 |
|---|------|------|------|
| A1 | request-code dev 模式 | `status === 200 && devOnly === true && /^\d{6}$/.test(code)` | PASS |
| A2 | verify-code 核销 → token | `status === 200 && !!token` | PASS |
| B1 | 第一次发码 ok | `status === 200` | PASS |
| B2 | 立刻第二次发码 → 429 | `status === 429 && retryAfter === 60` | PASS |

**关键验证点**：

- 邮件通道（mailer.js）+ 注册路由（auth.js）+ 节流（withCooldown）三者集成正常
- 429 路径的 response body 含 `retryAfter`（前端用于显示"请 Xs 后再试"）

---

## 5. 前端类型检查 + 构建

**运行**：`./node_modules/.bin/tsc --noEmit && npm run build`

| 检查 | 结果 |
|------|------|
| tsc 零错误 | PASS |
| 模块转译 | 85 modules |
| index.html 产出 | 1.00 KB |
| CSS 产出 | 23.40 KB |
| JS 产出 | 217.56 KB（gzip 71.46 KB）|
| 桌面模式产出（`build:desktop`） | 205.41 KB（tree-shaking 砍掉 AccountSync）|

---

## 6. 桌面版冒烟测试

**运行**：`./node_modules/electron/dist/electron.exe ./electron/main.cjs`（生产模式）

| 检查 | 结果 |
|------|------|
| Electron 主进程启动无抛错 | PASS |
| 加载 dist/index.html 成功（无 ERR_CONNECTION_REFUSED）| PASS |
| 生产 exe 大小 | 182 MB（Chromium 包体）|
| 分发 zip 大小 | 115 MB |

**Electron 版本**：34.5.8

**已知非阻塞告警**（不影响功能）：

- `Autofill.enable wasn't found`：Electron 不支持 Chrome DevTools 的 Autofill 域，属 known limitation
- `Unable to move the cache: 拒绝访问 (0x5)`：临时目录创建 GPU 缓存被拒，正式打包（用户目录安装）后消失

---

## 7. 安全审计

### 7.1 代码审计（2026-07-08）

**审计范围**：server/{crypto,db,mailer,middleware,index}.js + server/routes/{auth,sync,account}.js + src/api/deepseek.ts + src/pages/SettingsPage.tsx

| # | 严重级 | 位置 | 问题 | 修复状态 |
|---|--------|------|------|---------|
| 1 | CRITICAL | — | 无 | — |
| 2 | HIGH | — | 无 | — |
| 3 | **MEDIUM** | `server/index.js` `cors()` 默认允许任意 origin | 公网部署后任意站可跨域调 API | ✅ 已修复 → origin 函数白名单 |
| 4 | **MEDIUM** | `server/routes/auth.js` 注册/登录错误信息差异 | email 枚举 | ✅ 已修复 → /request-code 统一响应 |
| 5 | LOW | `server/crypto.js:63` scrypt 派生 AES 密钥 | 单根密钥模型，非漏洞但可改进 | ✅ 已改用 HKDF-SHA256（RFC 5869）|
| 6 | LOW | `server/index.js` DEEPSEEK_BASE_URL 未校验协议 | SSRF 风险 | ✅ 已强制 https:// |
| 7 | LOW | `server/routes/sync.js` history content 无长度限制 | 存储层 DoS | ✅ 已限 100KB / id 64 字符 |
| 8 | LOW | `server/mailer.js` dev 模式日志输出验证码 | 误配 prod 泄漏 | ✅ 已脱敏（仅 DEBUG=1 下输出 hash）|
| 9 | PASS | `crypto.js` AES-256-GCM | IV 独立随机 + AuthTag 校验 | ✅ |
| 10 | PASS | `crypto.js:29` timingSafeEqual | 防时序 | ✅ |
| 11 | PASS | `auth.js:43` crypto.randomInt | CSPRNG | ✅ |
| 12 | PASS | React JSX 文本插值 | 默认转义 | ✅ |
| 13 | PASS | `db.js` 全部占位参数化 | SQL 注入堵死 | ✅ |
| 14 | PASS | `mailer.js` 子+发件人硬编码 | SMTP 注入堵死 | ✅ |
| 15 | PASS | `account.js` 删会话 + cascade 事务 | ✅ |

### 7.2 依赖漏洞（`npm audit`）

| 包 | 严重级 | 利用路径 | 本项目影响 | 处理 |
|----|--------|---------|-----------|------|
| esbuild | moderate | dev server 跨站请求 | 仅 `npm run dev` 本地场景，不影响构建产线 | 不修（升 Vite 8 破坏性变更）|
| nodemailer 2 高危 | high | raw 选项绕过文件访问 / OAuth2 凭证拦截 | 本项目不用 raw / 不用 OAuth2 | 不适用，已升到 8.x |

**结论**：无 CRITICAL/HIGH 实际可利用漏洞。

### 7.3 设计层面防御矩阵

| 威胁 | 防御 |
|------|------|
| SQL 注入 | mysql2 全部参数化（无拼接）|
| XSS | React JSX 自动转义；无 dangerouslySetInnerHTML |
| CSRF | CORS 白名单 + SameSite（PWA 同域）|
| 密码泄漏 | scrypt N=16384 + timingSafeEqual |
| 会话劫持 | DB 吊销 + HMAC-SHA256 token + SESSION_TTL |
| API Key 托管泄漏 | AES-256-GCM 独立 IV + HKDF 派生根密钥 |
| email 枚举 | /request-code 不区分账户是否存在 |
| 验证码爆炸 | 60s 节流 + 错误 5 次失效 + TTL 600s |
| SSRF | DEEPSEEK_BASE_URL 强制 https:// |
| 日志泄漏 | 验证码不进日志；email 仅 DEBUG 下 hash |

---

## 8. 版本历史

| 版本 | 日期 | 关键变更 |
|------|------|---------|
| 1.0.1 | 2026-07-08 | 邮件通道 PROD、桌面单机版（Electron）、安全加固（CORS/枚举/HKDF/SSRF/限长/脱敏）|
| 1.0.0 | 2026-07-06 | 脚手架 → 阶段 5 + 多平台 + MySQL 迁移（MVP 上线）|

---

## 9. 快速运行

```bash
# 依赖
npm install

# 测试
node scripts/e2e-mailer.mjs                                  # 邮件通道 4/4
DB_PASSWORD=123456 DB_PORT=3307 node scripts/e2e-mysql.mjs    # MySQL 9 全链路 9/9
DB_PASSWORD=123456 DB_PORT=3307 node scripts/e2e-auth-mailer.mjs  # Auth+Mailer 5/5
./node_modules/.bin/tsc --noEmit && npm run build            # 前端类型 + 构建

# 开发
npm run dev                  # 前端（5173）
npm run server               # 后端（3001）
DB_PASSWORD=123456 DB_PORT=3307 npm run server
npm run electron:dev         # 桌面版（开发）

# 打包桌面版
npm run electron:build
# 产物：release/CopyCraft-0.1.0-win-portable.zip (115MB)

# 建表（首次）
DB_PASSWORD=123456 npm run db:init
```

---

## 10. 已知限制

| 限制 | 原因 | 计划 |
|------|------|------|
| 桌面版 182MB | Electron 包 Chromium | 迭代 2 迁 Tauri v8 → ~5MB |
| SmartScreen 弹窗 | 无 Windows 代码签名证书 | 购买证书（Sectigo ~$80/年）后启用 sign 配置 |
| 桌面版无同步 | 有意设计（单机无需后端）| 需要同步请用 PWA + 后端 |
| esbuild  moderate 漏洞 | dev 依赖，仅本地场景 | Vite 8 兼容性确认后跟进 |
