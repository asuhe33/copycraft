import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './context';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

// 错误边界：任何渲染异常都不应该让整个页面白屏
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'system-ui, sans-serif',
          padding: 24, textAlign: 'center', background: '#f9fafb', color: '#111',
        }}>
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>页面加载出错</h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              {this.state.error.message || '未知错误'}
            </p>
            <button
              onClick={() => {
                // 清缓存 + 重载：最常用的修复手段
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) =>
                    Promise.all(regs.map((r) => r.unregister()))
                  ).then(() => window.location.reload());
                } else {
                  window.location.reload();
                }
              }}
              style={{
                background: '#ff4d6d', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: 8, fontSize: 14,
                cursor: 'pointer', marginRight: 8,
              }}
            >
              清缓存并刷新
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#e5e7eb', color: '#111', border: 'none',
                padding: '10px 24px', borderRadius: 8, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              直接刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// PWA service worker 注册（仅生产模式）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[CopyCraft] SW registered:', reg.scope);
        // SW 更新后自动刷新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[CopyCraft] SW updated, reloading');
            }
          });
        });
      })
      .catch((err) => console.warn('[CopyCraft] SW registration failed:', err));
  });
}
