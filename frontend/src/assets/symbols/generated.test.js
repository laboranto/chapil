import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const NAMES = ['home','records','settings','fuel','charge','maintenance','other','car','import','export','copy','kebab']
const dir = fileURLToPath(new URL('.', import.meta.url))

describe('생성된 아이콘 SVG', () => {
  for (const name of NAMES) {
    it(`${name}.svg — currentColor 단일 path + 유효한 viewBox`, () => {
      const svg = readFileSync(`${dir}${name}.svg`, 'utf-8')
      expect(svg).toContain('fill="currentColor"')
      expect(svg.match(/<path/g)).toHaveLength(1)
      const vb = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number)
      expect(vb).toHaveLength(4)
      expect(vb.every(Number.isFinite)).toBe(true)
      expect(vb[2]).toBeGreaterThan(0)
      expect(vb[3]).toBeGreaterThan(0)
    })
  }
})
