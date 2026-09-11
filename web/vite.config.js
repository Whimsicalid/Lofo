import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置：React 插件 + 开发代理
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // 将 /api 请求代理到后端服务
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 将 /uploads 静态资源代理到后端
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
