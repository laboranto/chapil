const MAX_ENTRIES = 30
const _buffer = []
const _orig = console.error.bind(console)

console.error = (...args) => {
  _orig(...args)
  const err = args.find(a => a instanceof Error)
  if (!err?.stack) return
  // 첫 줄(에러 메시지)은 제외하고 스택 위치만 수집
  const trace = err.stack.split('\n').slice(1).join('\n').trim()
  if (!trace) return
  _buffer.push({ at: new Date().toISOString(), trace })
  if (_buffer.length > MAX_ENTRIES) _buffer.shift()
}

export function getLogs() {
  return [..._buffer]
}

export function getDeviceInfo() {
  const ua = navigator.userAgent
  return {
    appVersion: '26.6.1',
    android: ua.match(/Android ([\d.]+)/)?.[1] ?? null,
    model: ua.match(/Android[\d.\s]+;\s*([^)]+?)\s*(?:Build|wv)/)?.[1]?.trim() ?? null,
    webview: ua.match(/Chrome\/([\d.]+)/)?.[1] ?? null,
  }
}