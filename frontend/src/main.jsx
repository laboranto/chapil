import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB } from './db.js'
import { initImages } from './api.js'

initDB().then(() => initImages()).then(() => {
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
