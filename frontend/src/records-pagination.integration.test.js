/**
 * Integration test: 통합 기록 UNION 페이지네이션.
 * 3개 테이블에 날짜가 겹치는 행을 심고 limit=2로 끝까지 페이지네이션 →
 * 중복·누락 없이 date DESC, src ASC, id DESC 순서로 나오는지 검증.
 * sqlite-wasm 로더는 pagination.integration.test.js와 동일하게 node 전용 엔트리 직접 import.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildKeysetUnionQuery, nextUnionCursorFrom } from './pagination.js'
import sqlite3NodeInit from '../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-node.mjs'

const SCHEMA = `
  CREATE TABLE fuel (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, amount INTEGER, odometer INTEGER, interval_km INTEGER, liters REAL, unit_price INTEGER, fuel_economy REAL, memo TEXT);
  CREATE TABLE maintenance (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, amount INTEGER, odometer INTEGER, item TEXT, memo TEXT);
  CREATE TABLE other (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, amount INTEGER, odometer INTEGER, item TEXT, memo TEXT);
`

let db

beforeAll(async () => {
  const sqlite3 = await sqlite3NodeInit()
  db = new sqlite3.oo1.DB(':memory:')
  db.exec(SCHEMA)
  // 같은 날짜 '2026-03-10'에 fuel·maintenance·other 각 1건씩 (src tie-break 유발)
  db.exec("INSERT INTO fuel (date,amount,odometer) VALUES ('2026-03-01',50000,1000),('2026-03-10',60000,1200),('2026-03-20',70000,1500)")
  // 같은 (date, src) 쌍 → 커서 3번째 항(date=? AND src=? AND id<?) 유발.
  // 앞선 행이 홀수(03-25 other 1건)라 limit=2 경계가 이 두 fuel 행 사이를 정확히 지난다.
  db.exec("INSERT INTO fuel (date,amount,odometer) VALUES ('2026-03-22',55000,1300),('2026-03-22',56000,1350)")
  db.exec("INSERT INTO maintenance (date,amount,odometer,item) VALUES ('2026-03-10',80000,1210,'엔진오일'),('2026-03-05',30000,1100,'점검')")
  db.exec("INSERT INTO other (date,amount,odometer,item) VALUES ('2026-03-10',15000,1220,'세차'),('2026-03-25',9000,1600,'주차')")
})

function page(cursor) {
  const { sql, params } = buildKeysetUnionQuery(cursor, 2)
  const rows = db.exec({ sql, bind: params, rowMode: 'object', returnValue: 'resultRows' })
  return { rows, nextCursor: nextUnionCursorFrom(rows, 2) }
}

describe('UNION 페이지네이션', () => {
  it('중복·누락 없이 전량을 정렬 순서대로 순회한다', () => {
    const all = []
    let cursor = null
    for (let i = 0; i < 20; i++) {
      const { rows, nextCursor } = page(cursor)
      all.push(...rows)
      if (!nextCursor) break
      cursor = nextCursor
    }
    expect(all).toHaveLength(9) // 5 + 2 + 2
    const keys = all.map(r => `${r.src}:${r.id}`)
    expect(new Set(keys).size).toBe(9) // 중복 없음
    // 정렬 단조성: date DESC, 그다음 src ASC, 그다음 id DESC
    const rank = { fuel: 0, maintenance: 1, other: 2 }
    for (let i = 1; i < all.length; i++) {
      const a = all[i - 1], b = all[i]
      const ok =
        a.date > b.date ||
        (a.date === b.date && rank[a.src] < rank[b.src]) ||
        (a.date === b.date && a.src === b.src && a.id > b.id)
      expect(ok, `${a.date}/${a.src}/${a.id} → ${b.date}/${b.src}/${b.id}`).toBe(true)
    }
    // 같은 날짜 2026-03-10 블록은 fuel → maintenance → other 순
    const mar10 = all.filter(r => r.date === '2026-03-10').map(r => r.src)
    expect(mar10).toEqual(['fuel', 'maintenance', 'other'])
  })
})
