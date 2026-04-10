import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET?.trim() ||
    env.VITE_API_BASE_URL?.trim() ||
    'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // 開發時將 /api/* 代理到同一個 backend BASE URL
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
