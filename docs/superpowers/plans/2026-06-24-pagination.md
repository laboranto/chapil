# 무한 스크롤 페이지네이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주유·정비·기타 기록 목록을 keyset(커서) 기반 무한 스크롤로 전환해, 기록량과 무관하게 일정한 비용으로 로드한다.

**Architecture:** 커서 계산 로직을 순수 함수 모듈(`pagination.js`)로 분리해 단위 테스트하고, `api.js`에 종류별 페이지 함수를 얇은 래퍼로 추가한다. 공통 훅 `usePaginatedList`가 상태·IntersectionObserver를 캡슐화하고, 세 List 컴포넌트가 이를 사용한다. 기존 전체조회(폼 계산)·집계 통계(Home)는 건드리지 않는다.

**Tech Stack:** React 19, react-router-dom 7, sqlite-wasm(클라이언트 OPSS/localStorage), vitest(신규 — 이 레포 최초 테스트 인프라).

## Global Constraints

- `date`는 ISO `YYYY-MM-DD` 형식으로 저장되어 사전순 = 시간순이 성립한다(현재 production 전제). 이 정렬에 의존하므로 포맷을 바꾸지 않는다.
- 기존 `api.getFuel()` / `getMaintenance()` / `getOther()` 전체조회와 `getDashboard`의 `SELECT SUM/AVG` 통계는 **절대 수정하지 않는다**(폼 계산·홈 통계가 의존).
- 페이지 함수에 넘기는 `table` 인자는 **코드 상수에서만** 전달된다(사용자 입력 아님) → 문자열 조립에 SQL 인젝션 위험 없음.
- page size 기본값 **50**.
- 커서 SQL: `WHERE date < ? OR (date = ? AND id < ?)`, 정렬 `ORDER BY date DESC, id DESC`.

---

### Task 1: 커서 순수 함수 모듈 + vitest 셋업

**Files:**
- Create: `frontend/src/pagination.js`
- Create: `frontend/src/pagination.test.js`
- Modify: `frontend/package.json` (vitest devDep + test 스크립트)

**Interfaces:**
- Produces:
  - `buildKeysetQuery(table: string, cursor: {date,id}|null, limit: number) → { sql: string, params: any[] }`
  - `nextCursorFrom(rows: object[], limit: number) → {date,id} | null`
  - `PAGE_SIZE: number` (= 50)

- [ ] **Step 1: vitest 설치**

Run: `cd frontend && npm install -D vitest`
Expected: `vitest`가 devDependencies에 추가됨.

- [ ] **Step 2: package.json에 test 스크립트 추가**

`frontend/package.json`의 `"scripts"`에 한 줄 추가:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 3: 실패하는 테스트 작성**

Create `frontend/src/pagination.test.js`:
```js
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
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `cd frontend && npm test`
Expected: FAIL — `pagination.js`가 없어 import 에러.

- [ ] **Step 5: 최소 구현 작성**

Create `frontend/src/pagination.js`:
```js
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
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd frontend && npm test`
Expected: PASS — 6개 테스트 모두 통과.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/pagination.js frontend/src/pagination.test.js frontend/package.json frontend/package-lock.json
git commit -m "feat: keyset 페이지네이션 순수 함수 + vitest 셋업"
```

---

### Task 2: api.js 페이지 함수 3종 추가

**Files:**
- Modify: `frontend/src/api.js` (상단 import 1줄, `api` 객체에 함수 3개 추가)

**Interfaces:**
- Consumes: `buildKeysetQuery`, `nextCursorFrom`, `PAGE_SIZE` (Task 1)
- Produces (api 객체 메서드):
  - `api.getFuelPage({ cursor?, limit? }) → { rows, nextCursor }`
  - `api.getMaintenancePage({ cursor?, limit? }) → { rows, nextCursor }`
  - `api.getOtherPage({ cursor?, limit? }) → { rows, nextCursor }`

- [ ] **Step 1: import 추가**

`frontend/src/api.js` 1행 부근, 기존 `import { getDB } from './db.js'` 아래에 추가:
```js
import { buildKeysetQuery, nextCursorFrom, PAGE_SIZE } from './pagination'
```

- [ ] **Step 2: 페이지 함수 3개 추가**

`api.js`의 `export const api = {` 객체 안, `getFuel:` 메서드 근처에 추가(어디든 객체 멤버로 들어가면 됨). `rows()`는 api.js에 이미 정의된 헬퍼다.
```js
  // ── 목록 페이지네이션 (keyset) ─────────────────────────────────────
  // 기존 getFuel/getMaintenance/getOther 전체조회는 그대로 둔다(폼 계산·통계용).
  getFuelPage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('fuel', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },

  getMaintenancePage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('maintenance', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },

  getOtherPage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('other', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },
```

- [ ] **Step 3: 빌드 검증 (회귀 없음 확인)**

Run: `cd frontend && npm run build`
Expected: 빌드 성공(문법 오류 없음). 기존 메서드는 손대지 않았으므로 폼·홈 동작 불변.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/api.js
git commit -m "feat: api에 getFuelPage/getMaintenancePage/getOtherPage 추가"
```

---

### Task 3: usePaginatedList 훅 + FuelList 적용 (첫 적용 + 실동작 검증)

**Files:**
- Create: `frontend/src/hooks/usePaginatedList.js`
- Modify: `frontend/src/pages/FuelList.jsx`

**Interfaces:**
- Consumes: `api.getFuelPage` (Task 2)
- Produces: `usePaginatedList(fetchPage) → { records, hasMore, loading, sentinelRef, removeRecord }`
  - `fetchPage`: `async ({ cursor }) => ({ rows, nextCursor })`
  - `removeRecord(id)`: 로컬 상태에서 해당 id 행 제거(삭제용, API 재호출 없음)

- [ ] **Step 1: 훅 작성**

Create `frontend/src/hooks/usePaginatedList.js`:
```js
import { useState, useEffect, useRef, useCallback } from 'react'

// 무한 스크롤 목록 공통 훅.
// fetchPage: async ({ cursor }) => ({ rows, nextCursor })
// - 마운트 시 첫 페이지 로드.
// - sentinelRef를 목록 끝 요소에 달면, 그 요소가 화면에 들어올 때 다음 페이지를 이어 붙인다.
export function usePaginatedList(fetchPage) {
  const [records, setRecords] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef(null)

  // 비동기 호출 사이에서 즉시 읽혀야 하는 값은 ref로 관리(중복 호출 방지).
  const cursorRef = useRef(null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const didInit = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    const { rows, nextCursor } = await fetchPage({ cursor: cursorRef.current })
    cursorRef.current = nextCursor
    hasMoreRef.current = nextCursor !== null
    setRecords(prev => [...prev, ...rows])
    setHasMore(hasMoreRef.current)
    setLoading(false)
    loadingRef.current = false
  }, [fetchPage])

  const removeRecord = useCallback((id) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  // 마운트 시 첫 페이지 1회 로드 (StrictMode 이중 실행 방지: didInit 가드)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    loadMore()
  }, [loadMore])

  // sentinel이 보이면 다음 페이지 로드.
  // 첫 50개가 화면을 못 채우면 sentinel이 즉시 보여 연쇄 로드된다(뷰포트가 차거나 데이터 소진까지) — 정상 동작.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    })
    ob.observe(el)
    return () => ob.disconnect()
  }, [loadMore, hasMore])

  return { records, hasMore, loading, sentinelRef, removeRecord }
}
```

- [ ] **Step 2: FuelList에 훅 적용**

`frontend/src/pages/FuelList.jsx` 상단 import 교체 — `useState, useEffect` 제거하고 훅 import 추가:
```js
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { useSettings } from '../context/SettingsContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
```

함수 본문 상단의 상태/이펙트/삭제 블록을 교체:
```js
export default function FuelList() {
  const navigate = useNavigate()
  const { options, settings } = useSettings()
  const economyUnit = options.car_fuel.find(o => o.code === settings.car_fuel)?.economy_unit ?? 'km/L'
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(api.getFuelPage)

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteFuel(id)
    removeRecord(id)
  }
```
(기존 `const [records, setRecords] = useState([])`, `useEffect(() => { api.getFuel().then(setRecords) }, [])`, 그리고 `setRecords(prev => prev.filter(...))` 라인이 위 코드로 대체된다.)

- [ ] **Step 3: empty 처리 + sentinel 추가**

`<div className="content">` 안의 렌더 분기를 수정. 기존:
```js
{records.length === 0
  ? <div className="empty">주유 기록이 없어요</div>
  : records.map(r => {
```
를 빈 목록 판정에 `!hasMore`를 더하고(로딩 중 깜빡임 방지), map 닫힌 뒤 sentinel을 추가:
```js
{records.length === 0 && !hasMore
  ? <div className="empty">주유 기록이 없어요</div>
  : records.map(r => {
      /* ...기존 카드 렌더 그대로... */
  })}
{hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
```
(sentinel `<div>`는 `</div>`로 닫는 `.content` 컨테이너 **안**, map 표현식 **뒤**에 위치한다.)

- [ ] **Step 4: 앱 실행 — 단위 테스트로 못 잡는 실동작 수동 검증**

Run: `cd frontend && npm run dev` 후 브라우저에서 주유 목록(`/fuel`) 확인.
Expected (각각 눈으로 확인):
- 목록이 최신순으로 뜬다(기존과 동일한 순서·내용).
- 기록이 50개 초과면, 아래로 스크롤할 때 다음 묶음이 끊김 없이 이어 붙는다(중복·누락 없음).
- **기록 추가 후 목록 복귀**: `+`로 새 기록 저장 → 목록으로 돌아왔을 때 **맨 위에 새 기록이 보인다**. (라우트 재마운트로 첫 페이지가 다시 로드되는 가정의 검증 — 이게 깨지면 reset 로직을 별도로 넣어야 함)
- **삭제**: 한 건 삭제 시 해당 카드만 사라지고 목록은 유지된다.
- 기록이 0건일 때 "주유 기록이 없어요"가 정상 표시된다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/hooks/usePaginatedList.js frontend/src/pages/FuelList.jsx
git commit -m "feat: usePaginatedList 훅 + FuelList 무한 스크롤 적용"
```

---

### Task 4: MaintenanceList · OtherList 적용

**Files:**
- Modify: `frontend/src/pages/MaintenanceList.jsx`
- Modify: `frontend/src/pages/OtherList.jsx`

**Interfaces:**
- Consumes: `usePaginatedList` (Task 3), `api.getMaintenancePage` / `api.getOtherPage` (Task 2)

- [ ] **Step 1: MaintenanceList 적용**

상단 import 교체(`useState, useEffect` 제거, 훅 추가):
```js
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { usePaginatedList } from '../hooks/usePaginatedList'
```
본문 상단 상태/이펙트/삭제 블록 교체:
```js
export default function MaintenanceList() {
  const navigate = useNavigate()
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(api.getMaintenancePage)

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteMaintenance(id)
    removeRecord(id)
  }
```
렌더 분기 + sentinel:
```js
{records.length === 0 && !hasMore
  ? <div className="empty">정비 기록이 없어요</div>
  : records.map(r => (
      /* ...기존 카드 렌더 그대로... */
  ))}
{hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
```

- [ ] **Step 2: OtherList 적용**

상단 import 교체(MaintenanceList와 동일 형태):
```js
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { usePaginatedList } from '../hooks/usePaginatedList'
```
본문 상단 교체:
```js
export default function OtherList() {
  const navigate = useNavigate()
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(api.getOtherPage)

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteOther(id)
    removeRecord(id)
  }
```
렌더 분기 + sentinel:
```js
{records.length === 0 && !hasMore
  ? <div className="empty">기타 지출 기록이 없어요</div>
  : records.map(r => (
      /* ...기존 카드 렌더 그대로... */
  ))}
{hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
```

- [ ] **Step 3: 앱 실행 — 두 목록 수동 검증**

Run: `cd frontend && npm run dev`
Expected: 정비 목록(`/maintenance`)·기타 목록(`/other`)에서 Task 3 Step 4와 동일한 항목(최신순 표시 / 스크롤 이어붙임 / 추가 후 맨 위 / 삭제 / 빈 목록)이 모두 정상.

- [ ] **Step 4: 빌드 검증**

Run: `cd frontend && npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/pages/MaintenanceList.jsx frontend/src/pages/OtherList.jsx
git commit -m "feat: 정비·기타 목록 무한 스크롤 적용"
```

---

## 검증 분리 (요약)

- **단위 테스트(vitest)**: 커서 순수 함수 — `buildKeysetQuery`, `nextCursorFrom` (Task 1).
- **수동 검증(앱 실행)**: 훅·IntersectionObserver·스크롤 연쇄·추가 후 갱신·삭제는 jsdom 없이 브라우저에서 눈으로 확인(Task 3·4). jsdom+testing-library 도입은 YAGNI로 제외.

## 배포 주의

이 변경은 frontend 코드 수정이다. 반영하려면 `git pull` 후 NAS에서 **`docker compose up -d --build`**(재빌드)가 필요하다 — Dockerfile이 multi-stage라 컨테이너 빌드 시점에 `dist`를 생성하므로, 재빌드 없이는 적용되지 않는다.
