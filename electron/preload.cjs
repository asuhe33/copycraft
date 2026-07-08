/**
 * Electron preload — 渲染进程与主进程的安全桥梁
 *
 * 当前版本：不暴露任何 Node API（前端 PWA 代码零改造）。
 * 未来扩展点：文件读写（导出 Markdown 到本地）、系统托盘、自动更新。
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('copycraftDesktop', {
  // 让前端知道当前运行在桌面端（与 VITE_MODE=desktop 编译期开关双保险）
  isDesktop: true,
  platform: process.platform,
  // 未来：versions.electron / versions.chrome 等
});
