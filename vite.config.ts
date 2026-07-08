import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // 相对路径 base：保证 dist 无论部署在任何子路径（GitHub Pages / 静态站点）都能跑
  base: './',
  // 桌面单机模式 define：VITE_MODE=desktop 时注入 IS_DESKTOP=true（tree-shaking 用）
  define: {
    'import.meta.env.VITE_MODE': JSON.stringify(mode === 'desktop' ? 'desktop' : ''),
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      // 本地联调：/api 转发到后端服务（npm run server，默认 3001 端口）
      // 桌面单机版不连后端，无需 proxy（IS_DESKTOP 前端逻辑会跳过 /api 调用）
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 桌面模式不内联小块（避免 electron 加载器解析冲突）
    assetsInlineLimit: mode === 'desktop' ? 0 : 4096,
  },
}));
