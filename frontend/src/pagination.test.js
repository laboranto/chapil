import { describe, it, expect } from 'vitest'
import { buildKeysetQuery, nextCursorFrom } from './pagination'

describe('buildKeysetQuery', () => {
  it('cursor가 null이면 WHERE 없는 첫 페이지 쿼리', () => {
    const { sql, params } = buildKeysetQuery('fuel', null, 50)
    expect(sql).toBe('SELECT * FROM fuel ORDER BY date DESC, id DESC LIMIT ?')
    expect(params).toEqual([50])
  })

  it('cursor가 있으면 WHERE 절 + params 순서가 정확하다', () => {
    const { sql, params } = buildKeysetQuery('fuel', { date: '2026-01-01', id: 10 }, 50)
    expect(sql).toContain('WHERE date < ? OR (date = ? AND id < ?)')
    expect(sql).toContain('ORDER BY date DESC, id DESC LIMIT ?')
    expect(params).toEqual(['2026-01-01', '2026-01-01', 10, 50])
  })

  it('table 인자가 SQL에 반영된다', () => {
    expect(buildKeysetQuery('maintenance', null, 50).sql).toContain('FROM maintenance')
  })
})

describe('nextCursorFrom', () => {
  it('빈 배열이면 null', () => {
    expect(nextCursorFrom([], 50)).toBeNull()
  })

  it('가져온 행이 limit보다 적으면 마지막 페이지 → null', () => {
    expect(nextCursorFrom([{ date: '2026-01-01', id: 1 }], 50)).toBeNull()
  })

  it('정확히 limit개면 마지막 행의 {date,id}를 커서로 반환', () => {
    const rows = [
      { date: '2026-01-02', id: 2 },
      { date: '2026-01-01', id: 1 },
    ]
    expect(nextCursorFrom(rows, 2)).toEqual({ date: '2026-01-01', id: 1 })
  })
})
