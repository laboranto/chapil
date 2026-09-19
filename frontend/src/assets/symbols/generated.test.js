import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const NAMES = ['fuel','charge','maintenance','other','car','settings','import','export','copy']
const THEMES = ['material', 'breeze', 'apple']
const dir = fileURLToPath(new URL('.', import.meta.url))

describe('아이콘 SVG', () => {
  for (const theme of THEMES) {
    it(`${theme}/ — 이름 9개가 정확히 갖춰져 있다`, () => {
      // 하나라도 비면 index.js가 material로 떨어져 테마가 섞인다
      expect(readdirSync(`${dir}${theme}`).filter(f => f.endsWith('.svg')).sort())
        .toEqual(NAMES.map(n => `${n}.svg`).sort())
    })

    for (const name of NAMES) {
      it(`${theme}/${name}.svg — currentColor · 유효한 viewBox · 외부 참조 없음`, () => {
        const svg = readFileSync(`${dir}${theme}/${name}.svg`, 'utf-8')
        expect(svg).toContain('currentColor')
        // 색이 박혀 있으면 테마·다크모드를 안 따라온다
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
        // 그라데이션·필터 참조가 남으면 defs를 지운 탓에 안 보이게 된다
        expect(svg).not.toContain('url(')
        const vb = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number)
        expect(vb).toHaveLength(4)
        expect(vb.every(Number.isFinite)).toBe(true)
        expect(vb[2]).toBeGreaterThan(0)
        expect(vb[3]).toBeGreaterThan(0)
      })
    }
  }
})
