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
