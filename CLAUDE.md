# CLAUDE.md — CopyCraft 项目开发上下文

> 本文件是 Claude Code 的项目协作上下文。用户说"继续开发"时，Claude 应先读取本文件恢复上下文。

---

## 1. 产品定位

**CopyCraft · 文案魔匠** — 多平台文案适配分发工具

- 用户输入产品描述/卖点 → AI 按平台特性重写为易传播的短文案
- 支持编辑 / 复制 / 导出 Markdown / 历史留存
- **MVP 阶段聚焦小红书种草闭环**，预留微博/抖音/公众号扩展位

## 2. 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + Vite 5 + TypeScript 5.5 |
| 样式 | TailwindCSS 3 + PostCSS + Autoprefixer |
| 路由 | React Router 6（HashRouter，静态托管友好）|
| 状态 | useContext + useReducer（无 Redux）|
| AI | DeepSeek `deepseek-chat`（OpenAI-compatible SSE 流式 API）|
| 存储 | localStorage（Key 脱敏、历史最多 100 条）|
| 部署 | 纯静态产物（dist/）|

## 3. 代码仓库

- **GitHub**: https://github.com/asuhe33/copycraft
- **本地目录**: `E:\x7345\copycraft-mvp-v1.0.0`
- **默认分支**: `main`
- **首次提交**: `a6cfda8` feat: MVP v1.0.0

## 4. 已完成阶段

### 阶段 1 ✅ 脚手架 + 基础框架
- React + Vite + TS + Tailwind 全栈脚手架
- HashRouter 三页路由（生成/历史/设置）
- AppContext + useReducer + Header/Footer/PageContainer

### 阶段 2 ✅ 核心输入 + 配置区
- 6 原子组件: Button/Textarea/Select/Input/Toggle/Spinner
- 4 业务组件: CopyInputPanel/PlatformPicker/ConfigPanel/KeyManager
- 全中文 UI，小红书品牌色板，亮/暗双模式

### 阶段 3 ✅ AI 调用 + 流式生成
- `api/deepseek.ts` — 完整 SSE 流式解析 + 错误映射 + Key 校验
- `prompts/index.ts` + `prompts/xiaohongshu.ts` — 平台 prompt 工厂 + 小红书模板
- `useGenerate` — callback → React state + AbortController 中止
- `ResultCard` / `ResultList` — 流式打字机 + 错误态 + 复制/编辑/删除
- SettingsPage 接入真实 validateKey

### 阶段 4 ✅ 结果运营（MVP 交付）
- `useHistory` — localStorage 持久化，最多 100 条
- `useCopy` — 剪贴板 + 降级
- `utils/export.ts` — 单条 MD/TXT、全部 MD 导出
- HistoryPage — 关键词搜索 / 平台筛选 / 复制全部 / 导出 / 清空
- HomePage — 生成写入历史 + 删除同步历史
- 生产构建通过（77 模块，65KB gzip）

## 5. 目录结构

```
copycraft-mvp-v1.0.0/
├── src/
│   ├── api/deepseek.ts          # DeepSeek 流式调用 + Key 校验
│   ├── components/
│   │   ├── atoms/               # Button/Input/Select/Textarea/Toggle/Spinner
│   │   ├── business/            # ResultCard/ResultList/CopyInputPanel/PlatformPicker/ConfigPanel/KeyManager
│   │   └── layout/              # Header/Footer/PageContainer
│   ├── constants/               # routes/platforms/defaults
│   ├── context/                 # AppContext + appReducer
│   ├── hooks/                   # useGenerate/useCopy/useHistory
│   ├── pages/                   # HomePage/HistoryPage/SettingsPage
│   ├── prompts/                 # index.ts(工厂) + xiaohongshu.ts(模板)
│   ├── types/                   # platform/copy
│   └── utils/                   # export/crypto
├── dist/                        # 预构建产物
├── CLAUDE.md                    # 本文件
└── package.json
```

## 6. 关键约定

### 6.1 路径
- **唯一真实项目目录**: `E:\x7345\copycraft-mvp-v1.0.0`
- **严禁使用 Write 工具写 src 内容**：本环境下 Write 工具默认写入 `C:\Users\x7345\first-cc`（错误路径）
- **所有项目文件写入必须用 Bash heredoc**：`cat > E:/x7345/copycraft-mvp-v1.0.0/... << 'EOF' ... EOF`
- **git 操作**：在 `E:/x7345/copycraft-mvp-v1.0.0` 目录内执行

### 6.2 Git 工作流
```bash
cd E:/x7345/copycraft-mvp-v1.0.0
git add -A
git commit -m "feat: xxx"
git push                 # 推送到 origin/main
git push -u origin x     # 新功能用 feature 分支
```

### 6.3 Code Style
- TypeScript 严格模式，但 `noUnusedLocals: false` 放宽
- 组件用 `function` 声明，不用 `const Arrow = () =>`
- Props 接口用 `interface Props { ... }`（不用 `type`）
- 样式用 Tailwind utility class，极少情况用 CSS module
- 中文 UI，代码注释中英混合优先中文
- 提交信息用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:`

### 6.4 AI 接入
- **Provider**: DeepSeek ONLY（未来可扩）
- **模型**: `deepseek-chat`（不要换，用户已购买额度）
- **API Base URL**: `https://api.deepseek.com/v1`
- **Key 位置**: 浏览器 localStorage，key = `copycraft_api_key`
- **Key 脱敏规则**: 保留前 4 后 4，中间 `***`
- **历史 key**: `copycraft_history`（最多 100 条）

### 6.5 多平台扩展
- 新增平台必须改 3 处：
  1. `src/types/platform.ts` — 在 `PlatformId` union type 加一项
  2. `src/constants/platforms.ts` — 加静态元数据 + `enabled: true`
  3. `src/prompts/<platform>.ts` — 写 prompt 模板，并在 `prompts/index.ts` 的 `buildPrompt` 中加 case

## 7. 版本节奏（Vibe Coding 模式）

| 规则 | 说明 |
|------|------|
| 阶段暂停 | 每完成一个大阶段（模块集），自动暂停等用户确认后再推进 |
| 可运行 | 每阶段结束时，必须 `npm run dev` 无红报 + `npx tsc --noEmit` 通过 |
| 可验证 | 每阶段给用户 7 条清单，用户浏览器打开 localhost 自检 |
| 用户驱动 | 技术方案由我提，用户拍板再动 |
| 不做多余 | MVP 阶段只写闭环必需，不堆砌冗余功能 |

## 8. 下一步候选（待用户选择）

按优先级排序：

1. **多平台扩展**：扩写微博 / 抖音 / 公众号的 prompt 模板，显示多平台切换 UI
2. **模板系统**：保存常用输入组合（产品+受众+关键词）为可复用模板
3. **GitHub Pages 自动部署**：加 `dist/` 发布到免费公网预览
4. **服务端代理**：把 DeepSeek Key 移到后端，前端走自己的 BFF（Vite proxy 或 Serverless）
5. **PWA 离线支持**：service worker + manifest，免安装打开
6. **热门话题抓取**：对接第三站热搜 API，自动注入 #话题

## 9. 常用调试命令

```bash
# 进入项目
cd E:/x7345/copycraft-mvp-v1.0.0

# 类型检查
npx tsc --noEmit

# 开发服务器
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview

# 端口释放（如果 5173 被占）
netstat -ano | grep 5173
```

## 10. 紧急联系人 / 时间信息

- **项目创建**: 2026-07-07
- **MVP 交付**: 2026-07-07
- **用户 GitHub**: asuhe33
- **Claude 协作模式**: Vibe Coding + 阶段暂停
