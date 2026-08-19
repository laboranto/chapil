import { Capacitor } from '@capacitor/core'
import { api } from './api.js'

// 셀프호스팅(브라우저로 자기 서버에 접속)에서는 상대 경로가 곧 본인 서버다.
// 반면 스토어 앱(네이티브)은 웹뷰 오리진이 로컬 파일 서버라 상대 경로가 자기
// 자신을 가리켜 백업이 성립하지 않는다. 그래서 네이티브일 때만 기본 서버를 쓴다.
const DEFAULT_SERVER = 'https://chapil-demo.varmakoro.net'

function apiBase() {
  return Capacitor.isNativePlatform() ? DEFAULT_SERVER : ''
}

const CODE_KEY       = 'chapil:recovery:code'
const RETENTION_KEY  = 'chapil:recovery:retentionMonths'
const LAST_PUSH_KEY  = 'chapil:recovery:lastPush'
const NOTICE_ACK_KEY = 'chapil:recovery:noticeAcknowledged'
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const HKDF_INFO = new TextEncoder().encode('chapil-backup-v1')

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export function generateCode() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

async function deriveLookupKey(code) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return bytesToHex(new Uint8Array(digest))
}

async function deriveEncryptionKey(code) {
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(code), 'HKDF', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptPayload(code, dataObj) {
  const key = await deriveEncryptionKey(code)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(dataObj))
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const combined = new Uint8Array(iv.length + ciphertextBuf.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertextBuf), iv.length)
  return bytesToBase64(combined)
}

export async function decryptPayload(code, base64) {
  const key = await deriveEncryptionKey(code)
  const combined = base64ToBytes(base64)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plainBuf))
}

// navigator.clipboard(Async Clipboard API)는 secure context(HTTPS/localhost)에서만
// 존재한다. 이 앱은 Tailscale IP + 평문 HTTP로 접속하는 셀프호스팅 사용을 기본
// 가이드로 삼고 있어, 그 경우 navigator.clipboard가 undefined라 execCommand로
// 폴백해야 한다.
export async function copyToClipboard(text) {
  const clipboard = globalThis.navigator?.clipboard
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return true
    } catch {
      // 권한 거부 등 — 아래 폴백으로 넘어간다
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(textarea)
  return ok
}

export function getOrCreateCode() {
  let code = localStorage.getItem(CODE_KEY)
  if (!code) {
    code = generateCode()
    localStorage.setItem(CODE_KEY, code)
  }
  return code
}

export function regenerateCode() {
  const code = generateCode()
  localStorage.setItem(CODE_KEY, code)
  localStorage.removeItem(LAST_PUSH_KEY)
  return code
}

export function hasAcknowledgedNotice() {
  return localStorage.getItem(NOTICE_ACK_KEY) === '1'
}

export function acknowledgeNotice() {
  localStorage.setItem(NOTICE_ACK_KEY, '1')
}

export function getRetentionMonths() {
  const v = localStorage.getItem(RETENTION_KEY)
  return v ? Number(v) : null
}

export function setRetentionMonths(months) {
  if (months == null) localStorage.removeItem(RETENTION_KEY)
  else localStorage.setItem(RETENTION_KEY, String(months))
}

export async function pushBackup() {
  const code = getOrCreateCode()
  const lookupKey = await deriveLookupKey(code)
  const data = await api.exportData()
  const ciphertext = await encryptPayload(code, data)
  const res = await fetch(`${apiBase()}/api/recovery/${lookupKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciphertext, retention_months: getRetentionMonths() }),
  })
  if (!res.ok) throw new Error(`백업 전송 실패: ${res.status}`)
  // Capacitor 로컬 서버는 미상 경로에 index.html을 200으로 돌려준다. 응답이 JSON이
  // 아니면 백엔드에 닿지 않은 것이므로, 성공으로 오인해 LAST_PUSH를 갱신하면 안 된다.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('백업 서버에 연결할 수 없습니다.')
  }
  localStorage.setItem(LAST_PUSH_KEY, String(Date.now()))
}

export async function maybeAutoBackup() {
  const last = Number(localStorage.getItem(LAST_PUSH_KEY) || 0)
  if (Date.now() - last < AUTO_BACKUP_INTERVAL_MS) return
  try {
    await pushBackup()
  } catch {
    // 서버가 닿지 않는 등 — 다음 기회에 재시도(오프라인 시 조용히 무시)
  }
}

export async function restoreFromCode(code) {
  const lookupKey = await deriveLookupKey(code)
  const res = await fetch(`${apiBase()}/api/recovery/${lookupKey}`)
  if (res.status === 404) throw new Error('해당 코드로 저장된 백업이 없습니다.')
  if (!res.ok) throw new Error(`복원 실패: ${res.status}`)
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('백업 서버에 연결할 수 없습니다.')
  }
  const { ciphertext } = await res.json()
  return decryptPayload(code, ciphertext)
}

export async function deleteBackup(code) {
  const lookupKey = await deriveLookupKey(code)
  const res = await fetch(`${apiBase()}/api/recovery/${lookupKey}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`삭제 실패: ${res.status}`)
}
