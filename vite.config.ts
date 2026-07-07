import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // 相对路径 base：保证 dist 无论部署在任何子路径（GitHub Pages / 静态站点）都能跑
  base: './',
  server: {
    port: 5173,
    open: false,
    proxy: {
      // 本地联调：/api 转发到后端服务（npm run server，默认 3001 端口）
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
