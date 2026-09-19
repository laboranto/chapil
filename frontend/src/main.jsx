import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'
import { initDB, getDB } from './db.js'
import { initImages, api } from './api.js'
import { maybeAutoBackup } from './recovery.js'
import './logger.js'
import { detectTheme } from './theme.js'

// DB 초기화가 끝나야 React가 뜨는데 그게 수백 ms다. 그 전에 body가
// var(--surface)로 칠해지므로 테마는 여기서 동기로 찍어야 한다.
document.documentElement.dataset.theme = detectTheme()

async function maybeSeedDemo() {
  // 네이티브 앱(Capacitor)에는 데모 시드용 백엔드가 없다. 로컬 서버가 미상 경로에
  // index.html을 200으로 돌려주므로 fetch 성공 여부만으로는 걸러지지 않는다.
  if (Capacitor.isNativePlatform()) return

  const res = await fetch('/api/demo-seed').catch(() => null)
  if (!res?.ok) return
  if (!res.headers.get('content-type')?.includes('application/json')) return

  const db = getDB()
  const existing = (await db.query('SELECT COUNT(*) as n FROM fuel', [])).values[0]?.n ?? 0
  if (existing > 0) return
  const data = await res.json()
  await api.importConfirm(data)
}

initDB().then(() => maybeSeedDemo().catch(err => {
  // 데모 시드는 부가 기능이다. 실패해도 앱 기동을 막지 않는다.
  console.warn('데모 시드 건너뜀:', err)
})).then(() => initImages()).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  maybeAutoBackup()
}).catch(err => {
  console.error('DB 초기화 실패:', err)
  document.getElementById('root').innerHTML =
    `<pre style="padding:20px;color:red;white-space:pre-wrap">DB 초기화 실패:\n${err?.message ?? err}</pre>`
})
