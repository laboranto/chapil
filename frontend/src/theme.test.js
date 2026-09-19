import { describe, it, expect } from 'vitest'
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
