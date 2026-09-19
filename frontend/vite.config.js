import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    // 프록시가 없으면 /api/*가 index.html fallback(200 text/html)으로 잡혀서
    // maybeSeedDemo가 content-type 검사에서 걸러낸다 — 데모 시드가 조용히 안 걸린다.
    proxy: { '/api': 'http://127.0.0.1:8000' },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
