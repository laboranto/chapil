import { api } from './api.js'

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
  const res = await fetch(`/api/recovery/${lookupKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciphertext, retention_months: getRetentionMonths() }),
  })
  if (!res.ok) throw new Error(`백업 전송 실패: ${res.status}`)
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
  const res = await fetch(`/api/recovery/${lookupKey}`)
  if (res.status === 404) throw new Error('해당 코드로 저장된 백업이 없습니다.')
  if (!res.ok) throw new Error(`복원 실패: ${res.status}`)
  const { ciphertext } = await res.json()
  return decryptPayload(code, ciphertext)
}

export async function deleteBackup(code) {
  const lookupKey = await deriveLookupKey(code)
  const res = await fetch(`/api/recovery/${lookupKey}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`삭제 실패: ${res.status}`)
}
