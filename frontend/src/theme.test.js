import { describe, it, expect, beforeEach } from 'vitest'
import { detectTheme } from './theme'

const UA = {
  iphone:  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15',
  ipad:    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
  mac:     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0',
  android: 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140.0',
  linux:   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0',
}

describe('detectTheme', () => {
  it.each([
    ['iphone', 'apple'], ['ipad', 'apple'], ['mac', 'apple'],
    ['android', 'material'],
    ['linux', 'breeze'], ['windows', 'breeze'],
  ])('%s → %s', (key, expected) => {
    expect(detectTheme(UA[key])).toBe(expected)
  })

  it('알 수 없는 UA는 breeze로 떨어진다', () => {
    expect(detectTheme('')).toBe('breeze')
  })
})

// 수동 지정 — node 환경엔 localStorage가 없어 최소 구현을 끼운다
describe('detectTheme 수동 지정', () => {
  beforeEach(() => {
    const store = new Map()
    globalThis.localStorage = {
      getItem: k => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: k => store.delete(k),
    }
  })

  it('?theme=apple은 UA를 이긴다', () => {
    expect(detectTheme(UA.linux, '?theme=apple')).toBe('apple')
  })

  it('한 번 지정하면 쿼리 없이도 남는다 — 새로고침·HMR을 견뎌야 한다', () => {
    detectTheme(UA.linux, '?theme=material')
    expect(detectTheme(UA.linux, '')).toBe('material')
  })

  it('?theme=auto는 지정을 지우고 UA로 되돌린다', () => {
    detectTheme(UA.linux, '?theme=apple')
    expect(detectTheme(UA.linux, '?theme=auto')).toBe('breeze')
  })

  it('모르는 값은 무시한다', () => {
    expect(detectTheme(UA.android, '?theme=windows95')).toBe('material')
  })

  it('localStorage가 막혀도 UA 판별로 떨어진다', () => {
    globalThis.localStorage = { getItem() { throw new Error('denied') },
                                setItem() { throw new Error('denied') },
                                removeItem() { throw new Error('denied') } }
    expect(detectTheme(UA.iphone, '?theme=material')).toBe('apple')
  })
})
