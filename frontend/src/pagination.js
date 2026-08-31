// keyset(커서) 페이지네이션 순수 로직.
// table은 코드 상수에서만 전달된다(사용자 입력 아님) → 문자열 조립에 SQL 인젝션 위험 없음.

export const PAGE_SIZE = 50

export function buildKeysetQuery(table, cursor, limit) {
  if (!cursor) {
    return {
      sql: `SELECT * FROM ${table} ORDER BY date DESC, id DESC LIMIT ?`,
      params: [limit],
    }
  }
  return {
    sql:
      `SELECT * FROM ${table} WHERE date < ? OR (date = ? AND id < ?) ` +
      `ORDER BY date DESC, id DESC LIMIT ?`,
    params: [cursor.date, cursor.date, cursor.id, limit],
  }
}

export function nextCursorFrom(rows, limit) {
  if (rows.length < limit) return null
  const last = rows[rows.length - 1]
  return { date: last.date, id: last.id }
}

// ── 통합 기록(3테이블 UNION) 키셋 페이지네이션 ──────────────────────
// src 우선순위: fuel < maintenance < other (리터럴 문자열 비교).
// 정렬: date DESC, src ASC, id DESC.

const UNION_BODY =
  "SELECT id, date, 'fuel' AS src, amount, odometer, interval_km, liters, unit_price, fuel_economy, NULL AS item, memo FROM fuel" +
  " UNION ALL " +
  "SELECT id, date, 'maintenance' AS src, amount, odometer, NULL, NULL, NULL, NULL, item, memo FROM maintenance" +
  " UNION ALL " +
  "SELECT id, date, 'other' AS src, amount, odometer, NULL, NULL, NULL, NULL, item, memo FROM other"

const UNION_ORDER = 'ORDER BY date DESC, src ASC, id DESC LIMIT ?'

export function buildKeysetUnionQuery(cursor, limit) {
  if (!cursor) {
    return { sql: `SELECT * FROM (${UNION_BODY}) ${UNION_ORDER}`, params: [limit] }
  }
  return {
    sql:
      `SELECT * FROM (${UNION_BODY}) ` +
      'WHERE date < ? OR (date = ? AND src > ?) OR (date = ? AND src = ? AND id < ?) ' +
      UNION_ORDER,
    params: [cursor.date, cursor.date, cursor.src, cursor.date, cursor.src, cursor.id, limit],
  }
}

export function nextUnionCursorFrom(rows, limit) {
  if (rows.length < limit) return null
  const last = rows[rows.length - 1]
  return { date: last.date, src: last.src, id: last.id }
}
