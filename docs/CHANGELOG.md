# 📜 版本记录

## v1.0.0 — 2026-07-07 · MVP 交付

### 新增

**阶段 1 · 脚手架 + 基础框架**
- React 18 + Vite 5 + TypeScript 5.5 + TailwindCSS 3 全栈脚手架
- HashRouter 三页路由（生成 / 历史 / 设置）
- AppContext + useReducer 全局状态骨架
- Header / Footer / PageContainer 布局组件

**阶段 2 · 核心输入 + 配置区**
- 6 个原子组件：Button / Textarea / Select / Input / Toggle / Spinner
- 4 个业务组件：CopyInputPanel / PlatformPicker / ConfigPanel / KeyManager
- 全中文 UI，小红书品牌色板，亮/暗双模式

**阶段 3 · AI 调用 + 流式生成**
- `api/deepseek.ts`：DeepSeek OpenAI-compatible 流式 SSE 解析
- `prompts/`：小红书 prompt 模板 + 多平台扩展工厂
- `useGenerate` hook：callback → React state，AbortController 中止
- `ResultCard` / `ResultList`：流式打字机 + 错误态 + 修复提示
- SettingsPage 接入真实 Key 校验

**阶段 4 · 结果运营（MVP 交付）**
- `useHistory` hook：localStorage 持久化，最多 100 条
- `useCopy` hook：统一剪贴板 + 降级
- `utils/export.ts`：单条/全部 Markdown 导出、纯文本导出
- HistoryPage：关键词搜索 / 平台筛选 / 复制全部 / 导出 MD / 清空
- HomePage 生成完成自动同步历史，删除同步历史
- 生产构建通过（77 模块，65KB gzip）

### 已知限制

- 仅支持小红书一个平台（其他平台 UI 已占位，`enabled: false`）
- 无服务端，Key 仅存于浏览器 localStorage
- 历史最多 100 条，超出自动丢弃最早记录
- 无 PWA / 离线支持

### 后续规划

- 多平台扩写（微博 / 抖音 / 公众号）
- 模板系统
- 服务端同步（Key / 历史）
- 热门话题抓取
- PWA 离线化
