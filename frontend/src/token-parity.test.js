import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 테마 블록이 6개(3테마 × 라이트·다크)라 한 군데 빠뜨린 토큰은 눈에 안 띄고
// 다른 테마나 반대 모드 값으로 조용히 떨어진다. 집합이 같은지만 본다.
const css = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf-8')

const SELECTORS = [
  ':root, [data-theme="breeze"]',
  '[data-theme="material"]',
  '[data-theme="apple"]',
  ':root:not([data-theme]), [data-theme="breeze"]',
]

/** 셀렉터로 시작하는 블록들의 { 셀렉터: 토큰이름[] } */
function blocksOf(selector) {
  const found = []
  let from = 0
  for (;;) {
    const i = css.indexOf(selector + ' {', from)
    if (i < 0) return found
    const open = css.indexOf('{', i)
    const close = css.indexOf('}', open)
    found.push(css.slice(open + 1, close).match(/--[\w-]+(?=\s*:)/g) ?? [])
    from = close
  }
}

describe('디자인 토큰 블록 정합성', () => {
  // 라이트 3블록 + 다크 3블록. breeze는 셀렉터가 라이트/다크에서 다르므로 따로 잡힌다.
  const blocks = [
    ...blocksOf(SELECTORS[0]),
    ...blocksOf(SELECTORS[1]),
    ...blocksOf(SELECTORS[2]),
    ...blocksOf(SELECTORS[3]),
  ]

  it('테마 블록이 6개다', () => {
    expect(blocks).toHaveLength(6)
  })

  it('6블록이 모두 같은 토큰 집합을 선언한다', () => {
    const sets = blocks.map(b => [...new Set(b)].sort())
    for (const s of sets) expect(s).toEqual(sets[0])
    expect(sets[0].length).toBeGreaterThan(15)
  })

  it('다크 블록의 :root는 data-theme이 없을 때만 매칭된다', () => {
    // 맨 :root면 material/apple 라이트 값까지 덮어쓴다
    const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))
    expect(dark).not.toMatch(/^\s*:root\s*\{/m)
  })
})
