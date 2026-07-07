# 📦 部署指引

CopyCraft 是**纯前端 SPA**，任何静态托管服务都可部署。

---

## 方式一：直接托管 `dist/`（最快）

构建产物已在 `dist/` 目录中：

```
dist/
├── index.html
└── assets/
    ├── index-*.css
    └── index-*.js
```

把 **`dist/` 里的所有文件** 上传到任一静态托管：

| 平台 | 命令 / 入口 |
|------|------------|
| **Vercel** | `npx vercel --prod`（在 copycraft 根目录）|
| **Netlify** | 拖拽 `dist/` 文件夹到 <https://app.netlify.com/drop> |
| **Cloudflare Pages** | 上传 `dist/`，或 git 连接后设 `dist` 为发布目录 |
| **GitHub Pages** | 把 `dist/` 推到 `gh-pages` 分支，或在 Actions 中配置 |
| **国内 CDN（七牛 / 又拍 / 阿里云 OSS）**| 把 `dist/` 内容作为静态资源上传 |
| **Nginx / Apache** | 把 `dist/` 放到 web root |

> ⚠️ React Router 用的是 **HashRouter**，天然兼容静态托管，**不需要**服务器端 fallback 配置。

---

## 方式二：Docker（容器化部署）

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t copycraft:v1.0.0 .
docker run -p 8080:80 copycraft:v1.0.0
```

访问 <http://localhost:8080>。

---

## 方式三：Node 服务（PM2 / systemd）

```bash
# 启动生产预览
npm run preview

# 或用 PM2 守护
pm2 serve dist/ --name copycraft --port 3000
```

---

## 环境变量

CopyMVP v1.0.0 没有构建期环境变量，所有配置（API Key）都在浏览器端 `localStorage` 管理。

如果你后续要切换为「服务端代理 DeepSeek」模式，可新增：

```
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
VITE_DEEPSEEK_MODEL=deepseek-chat
```

在 `vite.config.ts` 中用 `loadEnv` 加载，并通过 Vite 的 `dev proxy` 转发。

---

## 部署自检清单

构建产物部署后，在浏览器控制台确认：

- [ ] 页面能加载，无 404 资源
- [ ] 「设置」页能保存和校验 Key
- [ ] 「生成」页能触发流式输出
- [ ] 「历史」页能查看刷新前后数据一致（localStorage 持久化）
- [ ] 浏览器 DevTools → Network → `api.deepseek.com` 请求正常（200 / 401）

---

*部署愉快 🚀*
