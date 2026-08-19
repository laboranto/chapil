import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { api } from './api.js'
import {
  generateCode, encryptPayload, decryptPayload,
  getOrCreateCode, regenerateCode,
  getRetentionMonths, setRetentionMonths,
  hasAcknowledgedNotice, acknowledgeNotice,
  pushBackup, maybeAutoBackup, restoreFromCode, deleteBackup,
  copyToClipboard,
} from './recovery.js'

// 서버가 정상 응답할 때의 최소 형태. recovery.js가 content-type을 검사하므로
// 목에도 JSON 헤더가 있어야 한다(없으면 '연결할 수 없습니다'로 걸러진다).
function jsonResponse(extra = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    ...extra,
  }
}

beforeEach(() => {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { for (const k in store) delete store[k] },
  }
  // 기본은 웹(셀프호스팅) — 상대 경로를 쓴다.
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
})

describe('generateCode', () => {
  it('64자 hex 문자열을 생성한다', () => {
    const code = generateCode()
    expect(code).toMatch(/^[0-9a-f]{64}$/)
  })

  it('호출할 때마다 다른 값을 생성한다', () => {
    expect(generateCode()).not.toBe(generateCode())
  })
})

describe('encryptPayload / decryptPayload', () => {
  it('암호화한 데이터를 같은 코드로 복호화하면 원본과 일치한다', async () => {
    const code = generateCode()
    const original = { vehicle: { car_plate: '123가4567' }, fuel: [{ date: '2026-01-01', amount: 50000 }] }
    const ciphertext = await encryptPayload(code, original)
    const decrypted = await decryptPayload(code, ciphertext)
    expect(decrypted).toEqual(original)
  })

  it('다른 코드로 복호화를 시도하면 실패한다', async () => {
    const code = generateCode()
    const wrongCode = generateCode()
    const ciphertext = await encryptPayload(code, { a: 1 })
    await expect(decryptPayload(wrongCode, ciphertext)).rejects.toThrow()
  })

  it('매 호출마다 IV가 달라 같은 데이터라도 암호문이 달라진다', async () => {
    const code = generateCode()
    const a = await encryptPayload(code, { a: 1 })
    const b = await encryptPayload(code, { a: 1 })
    expect(a).not.toBe(b)
  })
})

describe('getOrCreateCode / regenerateCode', () => {
  it('처음 호출하면 새 코드를 만들어 localStorage에 저장한다', () => {
    const code = getOrCreateCode()
    expect(localStorage.getItem('chapil:recovery:code')).toBe(code)
  })

  it('이미 코드가 있으면 같은 값을 반환한다', () => {
    const first = getOrCreateCode()
    const second = getOrCreateCode()
    expect(second).toBe(first)
  })

  it('regenerateCode는 기존과 다른 새 코드로 교체한다', () => {
    const original = getOrCreateCode()
    const fresh = regenerateCode()
    expect(fresh).not.toBe(original)
    expect(getOrCreateCode()).toBe(fresh)
  })
})

describe('보존 기간', () => {
  it('기본값은 null(무기한)이다', () => {
    expect(getRetentionMonths()).toBeNull()
  })

  it('설정한 값을 다시 읽을 수 있다', () => {
    setRetentionMonths(6)
    expect(getRetentionMonths()).toBe(6)
  })

  it('null로 설정하면 무기한으로 되돌아간다', () => {
    setRetentionMonths(6)
    setRetentionMonths(null)
    expect(getRetentionMonths()).toBeNull()
  })
})

describe('고지 확인 상태', () => {
  it('처음에는 확인되지 않은 상태다', () => {
    expect(hasAcknowledgedNotice()).toBe(false)
  })

  it('acknowledgeNotice 호출 후 true가 된다', () => {
    acknowledgeNotice()
    expect(hasAcknowledgedNotice()).toBe(true)
  })
})

describe('pushBackup', () => {
  it('exportData 결과를 암호화해서 PUT으로 전송하고 lastPush를 기록한다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    globalThis.fetch = fetchMock

    await pushBackup()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toMatch(/^\/api\/recovery\/[0-9a-f]{64}$/)
    expect(opts.method).toBe('PUT')
    expect(localStorage.getItem('chapil:recovery:lastPush')).not.toBeNull()
  })

  it('서버가 실패 응답을 주면 에러를 던진다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(pushBackup()).rejects.toThrow()
  })

  // 네이티브 앱은 웹뷰 오리진이 로컬 파일 서버라, 상대 경로로 보내면 자기 자신에게
  // 요청이 가서 백업이 성립하지 않는다. 반드시 절대 URL이어야 한다.
  it('네이티브 앱에서는 기본 서버의 절대 URL로 전송한다', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    globalThis.fetch = fetchMock

    await pushBackup()

    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/[^/]+\/api\/recovery\/[0-9a-f]{64}$/)
  })

  // 로컬 서버가 미상 경로에 index.html을 200으로 돌려주는 경우. 성공으로 오인해
  // lastPush를 갱신하면 백업이 안 된 채로 24시간 동안 재시도조차 하지 않는다.
  it('200이지만 JSON이 아닌 응답(HTML)은 성공으로 처리하지 않는다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
    })

    await expect(pushBackup()).rejects.toThrow('백업 서버에 연결할 수 없습니다.')
    expect(localStorage.getItem('chapil:recovery:lastPush')).toBeNull()
  })
})

describe('maybeAutoBackup', () => {
  it('마지막 푸시로부터 24시간이 안 지났으면 아무것도 하지 않는다', async () => {
    localStorage.setItem('chapil:recovery:lastPush', String(Date.now()))
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    await maybeAutoBackup()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('푸시 기록이 없으면(최초 실행) 바로 백업을 시도한다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    globalThis.fetch = fetchMock

    await maybeAutoBackup()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('서버가 닿지 않아도(오프라인) 에러를 던지지 않고 조용히 넘어간다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(maybeAutoBackup()).resolves.toBeUndefined()
  })
})

describe('restoreFromCode', () => {
  it('서버에서 받은 암호문을 복호화해서 원본 데이터를 반환한다', async () => {
    const code = generateCode()
    const original = { vehicle: { car_plate: '123가4567' }, fuel: [], maintenance: [], other: [] }
    const ciphertext = await encryptPayload(code, original)
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
      json: async () => ({ ciphertext, updated_at: '2026-07-16' }),
    }))

    const result = await restoreFromCode(code)

    expect(result).toEqual(original)
  })

  it('서버에 해당 코드로 저장된 백업이 없으면(404) 에러를 던진다', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(restoreFromCode(generateCode())).rejects.toThrow('해당 코드로 저장된 백업이 없습니다.')
  })
})

describe('deleteBackup', () => {
  it('DELETE 요청을 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    globalThis.fetch = fetchMock

    await deleteBackup(generateCode())

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('이미 삭제된 코드(404)에 대해서도 에러를 던지지 않는다', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(deleteBackup(generateCode())).resolves.toBeUndefined()
  })
})

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubDocument(execCommandReturn) {
    const execCommand = vi.fn().mockReturnValue(execCommandReturn)
    vi.stubGlobal('document', {
      createElement: () => ({ value: '', style: {}, focus() {}, select() {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
      execCommand,
    })
    return execCommand
  }

  it('navigator.clipboard.writeText가 있으면 그걸 우선 사용한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const execCommand = stubDocument(true)

    const result = await copyToClipboard('hello')

    expect(writeText).toHaveBeenCalledWith('hello')
    expect(execCommand).not.toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('navigator.clipboard가 없으면(secure context 아님) execCommand로 폴백한다', async () => {
    vi.stubGlobal('navigator', {})
    const execCommand = stubDocument(true)

    const result = await copyToClipboard('hello')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(result).toBe(true)
  })

  it('writeText가 실패해도(권한 거부 등) execCommand로 폴백한다', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const execCommand = stubDocument(true)

    const result = await copyToClipboard('hello')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(result).toBe(true)
  })

  it('둘 다 실패하면 false를 반환한다', async () => {
    vi.stubGlobal('navigator', {})
    stubDocument(false)

    const result = await copyToClipboard('hello')

    expect(result).toBe(false)
  })
})
