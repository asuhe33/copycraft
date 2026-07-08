export const ROUTES = {
  HOME: '/',
  HISTORY: '/history',
  SETTINGS: '/settings',
} as const;

/**
 * 桌面单机模式开关（编译期 tree-shaking）。
 *   - 浏览器 / PWA：VITE_MODE 未设置 → false → 同步/注册/云 Key UI 全显示
 *   - Electron 单机版：VITE_MODE=desktop → true → 屏蔽账户区块 + 登录按钮
 *
 * 注：运行时 window.copycraftDesktop?.isDesktop 是第二道防线。
 */
export const IS_DESKTOP = import.meta.env.VITE_MODE === 'desktop';
