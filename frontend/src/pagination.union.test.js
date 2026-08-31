import { describe, it, expect } from 'vitest'
import { buildKeysetUnionQuery, nextUnionCursorFrom } from './pagination'

describe('buildKeysetUnionQuery', () => {
  it('cursor가 null이면 WHERE 없이 UNION ALL 3개 + 정렬', () => {
    const { sql, params } = buildKeysetUnionQuery(null, 50)
    expect(sql.match(/UNION ALL/g)).toHaveLength(2)
    expect(sql).not.toContain('WHERE')
    expect(sql).toContain('ORDER BY date DESC, src ASC, id DESC LIMIT ?')
    expect(params).toEqual([50])
  })

  it('cursor가 있으면 3-OR WHERE + params 순서', () => {
    const { sql, params } = buildKeysetUnionQuery({ date: '2026-03-10', src: 'maintenance', id: 7 }, 50)
    expect(sql).toContain(
      'WHERE date < ? OR (date = ? AND src > ?) OR (date = ? AND src = ? AND id < ?)'
    )
    expect(params).toEqual(['2026-03-10', '2026-03-10', 'maintenance', '2026-03-10', 'maintenance', 7, 50])
  })

  it('fuel/maintenance/other 리터럴 src를 SELECT한다', () => {
    const { sql } = buildKeysetUnionQuery(null, 10)
    expect(sql).toContain("'fuel' AS src")
    expect(sql).toContain("'maintenance' AS src")
    expect(sql).toContain("'other' AS src")
  })
})

describe('nextUnionCursorFrom', () => {
  it('빈 배열이면 null', () => {
    expect(nextUnionCursorFrom([], 50)).toBeNull()
  })
  it('limit보다 적으면 null', () => {
    expect(nextUnionCursorFrom([{ date: '2026-01-01', src: 'fuel', id: 1 }], 50)).toBeNull()
  })
  it('정확히 limit개면 마지막 행의 {date,src,id}', () => {
    const rows = [
      { date: '2026-01-02', src: 'fuel', id: 2 },
      { date: '2026-01-01', src: 'other', id: 5 },
    ]
    expect(nextUnionCursorFrom(rows, 2)).toEqual({ date: '2026-01-01', src: 'other', id: 5 })
  })
})
