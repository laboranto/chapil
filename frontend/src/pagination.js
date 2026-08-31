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

// ⚠️ 통합 모드 행은 아래 11개 컬럼이 전부다 (id,date,src,amount,odometer,
//    interval_km,liters,unit_price,fuel_economy,item,memo). 카드 컴포넌트가
//    fuel의 type/location/category 등을 읽으면 필터 탭에서만 동작하고
//    전체 탭에서 조용히 undefined가 된다. 새 필드가 필요하면 세 SELECT 모두에 추가할 것.
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
