/**
 * Electron 主进程（CopyCraft 桌面单机版）
 *
 * 设计取舍：
 *   - 单机版不启动后端，直接加载 Vite 构建产物 dist/index.html
 *   - 所有同步/注册/云 Key 功能由前端通过 VITE_MODE=desktop 编译期开关屏蔽
 *   - 用户自备 DeepSeek Key 直连（前端 api/deepseek.ts 已有逻辑）
 *   - 不启用 nodeIntegration，用 contextBridge 暴露最小 API（未来扩展）
 *
 * 启动：npm run electron:dev    （开发，热更新需手动重启）
 * 打包：npm run electron:build  （electron-builder 出 portable .exe）
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const IS_DEV = process.env.ELECTRON_DEV === '1';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CopyCraft · 文案魔匠',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,   // 安全：渲染进程不直接访问 Node
      nodeIntegration: false,   // 安全：不注入 require
      sandbox: false,           // preload 需要访问 path 等
    },
  });

  // 外部链接（如 GitHub、DeepSeek 官网）用系统浏览器打开，不嵌在应用内
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('app://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  if (IS_DEV) {
    // 开发模式：连 Vite dev server（需先 npm run dev）
    win.loadURL('http://localhost:5173/');
    win.webContents.openDevTools();
  } else {
    // 生产模式：加载 Vite 构建产物
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    if (!fs.existsSync(indexHtml)) {
      console.error('[electron] dist/index.html 不存在，请先 npm run build');
      app.quit();
      return;
    }
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // macOS 习惯：dock 不退出；Windows/Linux 直接退
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 安全：禁止新窗口创建 + 禁止权限请求（地理位置、通知等）
app.on('web-contents-created', (e, contents) => {
  contents.on('new-window', (ev) => ev.preventDefault());
});
