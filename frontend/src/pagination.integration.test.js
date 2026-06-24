/**
 * Integration test: keyset pagination cursor boundary
 *
 * Tests that paginating through rows with multiple records sharing the same date
 * does not duplicate or skip rows. This exercises the (date = ? AND id < ?) tie-break
 * in buildKeysetQuery, which is the riskiest part of the cursor logic.
 *
 * Note on sqlite-wasm under vitest/node:
 *   The default @sqlite.org/sqlite-wasm export (bundler-friendly) uses `fetch` to load
 *   the WASM binary, which Node's undici does not support for file:// URLs.
 *   We import sqlite3-node.mjs directly (the package's node-specific entry) which uses
 *   fs.readFileSync — this is the same WASM engine running real SQL, just a different loader.
 *   We do NOT use db.js here to avoid pulling in the broken bundler-friendly loader.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { buildKeysetQuery, nextCursorFrom } from './pagination.js'

// Import the node-compatible sqlite-wasm loader directly
import sqlite3NodeInit from '../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-node.mjs'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS fuel (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    type        TEXT    NOT NULL DEFAULT '가득주유',
    amount      INTEGER NOT NULL,
    odometer    INTEGER NOT NULL
  );
`

// Seed data: 5 rows, 3 sharing the same date '2026-03-10'.
// With limit=2 the boundary looks like (ORDER BY date DESC, id DESC):
//   ids assigned in insert order: 1,2,3,4,5
//   full sequence: id5(2026-03-20), id4(2026-03-10), id3(2026-03-10), id2(2026-03-10), id1(2026-03-01)
//   page1=[id5,id4]  cursor={2026-03-10, id4}
//   page2=[id3,id2]  cursor={2026-03-10, id2}   ← tie-break: same date, id<4
//   page3=[id1]      cursor=null
const SEED_ROWS = [
  { date: '2026-03-01', amount: 50000, odometer: 10000 },
  { date: '2026-03-10', amount: 60000, odometer: 10200 },
  { date: '2026-03-10', amount: 55000, odometer: 10400 },
  { date: '2026-03-10', amount: 45000, odometer: 10600 },
  { date: '2026-03-20', amount: 70000, odometer: 10800 },
]

const LIMIT = 2

let oo1Db = null

function makeDbAdapter(db) {
  return {
    query: async (sql, params = []) => {
      const values = db.exec({
        sql,
        bind: params.length > 0 ? params : undefined,
        rowMode: 'object',
        returnValue: 'resultRows',
      })
      return { values }
    },
    run: async (sql, params = []) => {
      db.exec({
        sql,
        bind: params.length > 0 ? params : undefined,
      })
    },
  }
}

describe('keyset pagination: same-date boundary integration test', () => {
  beforeAll(async () => {
    // Use the node-compatible sqlite-wasm loader (uses fs.readFileSync, not fetch)
    const sqlite3 = await sqlite3NodeInit({ print: () => {}, printErr: () => {} })
    oo1Db = new sqlite3.oo1.DB(':memory:')
    oo1Db.exec(SCHEMA)

    // Insert seed rows in ascending date/id order
    for (const row of SEED_ROWS) {
      oo1Db.exec({
        sql: 'INSERT INTO fuel (date, type, amount, odometer) VALUES (?,?,?,?)',
        bind: [row.date, '가득주유', row.amount, row.odometer],
      })
    }
  })

  it('drives pagination to completion without duplicate or missing rows', async () => {
    const db = makeDbAdapter(oo1Db)

    // Ground truth: full ordered list from DB
    const groundTruth = (await db.query(
      'SELECT * FROM fuel ORDER BY date DESC, id DESC',
      []
    )).values
    expect(groundTruth.length).toBe(SEED_ROWS.length)

    // Drive pagination
    const allRows = []
    let cursor = null
    let pageCount = 0
    const maxPages = SEED_ROWS.length + 1  // safety cap against infinite loop

    while (pageCount < maxPages) {
      const { sql, params } = buildKeysetQuery('fuel', cursor, LIMIT)
      const { values } = await db.query(sql, params)
      allRows.push(...values)
      cursor = nextCursorFrom(values, LIMIT)
      pageCount++
      if (cursor === null) break
    }

    // 1. Total count matches seeded count
    expect(allRows.length).toBe(SEED_ROWS.length)

    // 2. No duplicate ids
    const ids = allRows.map(r => r.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(allRows.length)

    // 3. All ids from ground truth are present (no missing)
    const groundIds = groundTruth.map(r => r.id)
    expect([...ids].sort((a, b) => a - b)).toEqual([...groundIds].sort((a, b) => a - b))

    // 4. Global order is date DESC, id DESC (exact match with ground truth)
    expect(ids).toEqual(groundIds)

    // 5. Same-date rows split across a page boundary (tie-break was exercised)
    //    Re-paginate to collect pages and check boundaries
    const pages = []
    let c2 = null
    let p = 0
    while (p < maxPages) {
      const { sql, params } = buildKeysetQuery('fuel', c2, LIMIT)
      const { values } = await db.query(sql, params)
      pages.push(values)
      c2 = nextCursorFrom(values, LIMIT)
      p++
      if (c2 === null) break
    }

    // At least one boundary must fall between two rows sharing the same date
    let tieBreakExercised = false
    for (let i = 0; i < pages.length - 1; i++) {
      const lastOfPage = pages[i][pages[i].length - 1]
      const firstOfNext = pages[i + 1][0]
      if (lastOfPage && firstOfNext && lastOfPage.date === firstOfNext.date) {
        tieBreakExercised = true
        break
      }
    }
    expect(tieBreakExercised).toBe(true)
  })
})
