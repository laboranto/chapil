import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    // 개발 중 /api/* 요청을 FastAPI 서버(8000포트)로 대신 전달(proxy)한다.
    // 덕분에 api.js에서 'http://localhost:8000/api/...' 대신 '/api/...'만 써도 된다.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
