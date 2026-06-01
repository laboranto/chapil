import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB, getDB } from './db.js'
import { initImages, api } from './api.js'
import './logger.js'

async function maybeSeedDemo() {
  const res = await fetch('/api/demo-seed').catch(() => null)
  if (!res?.ok) return
  const db = getDB()
  const existing = (await db.query('SELECT COUNT(*) as n FROM fuel', [])).values[0]?.n ?? 0
  if (existing > 0) return
  const data = await res.json()
  await api.importConfirm(data)
}

initDB().then(() => maybeSeedDemo()).then(() => initImages()).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(err => {
  console.error('DB 초기화 실패:', err)
  document.getElementById('root').innerHTML =
    `<pre style="padding:20px;color:red;white-space:pre-wrap">DB 초기화 실패:\n${err?.message ?? err}</pre>`
})
