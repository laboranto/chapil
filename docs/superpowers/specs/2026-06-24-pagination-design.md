# 무한 스크롤 페이지네이션 설계

작성일: 2026-06-24

## 배경과 목적

차필의 기록 목록 화면(주유·정비·기타)은 현재 마운트 시 해당 종류의 **모든 기록을 한꺼번에** 불러와 전부 렌더한다. 지금 당장 느린 것은 아니지만, 기록이 누적되면 초기 로드·렌더 부담이 커질 것이 분명하다. **이번 작업의 목적은 성능 긴급 대응이 아니라 구조적 대비**다 — 기록량과 무관하게 일정한 비용으로 동작하도록 데이터 접근 구조를 바꾼다.

UX는 **무한 스크롤**로 한다(목록 끝에 도달하면 다음 묶음을 이어 붙임).

## 아키텍처 전제 (확인됨)

데이터 레이어는 이미 **클라이언트 sqlite-wasm(OPFS)** 으로 이전 완료된 상태다.

- [`frontend/src/db.js`](../../../frontend/src/db.js): 브라우저/앱 내부에서 sqlite-wasm을 구동, `fuel`·`maintenance`·`other`·`settings` 스키마를 클라이언트가 보유.
- [`frontend/src/api.js`](../../../frontend/src/api.js): 이름은 "api"지만 백엔드를 호출하지 않음. 전부 `getDB()` → 로컬 SQL 쿼리.
- `app/main.py`(FastAPI): 레거시 `/api/*` CRUD 라우트가 남아 있으나 프론트가 데이터로는 호출하지 않음. 실질 역할은 SPA 정적 서빙 + `/api/demo-seed`뿐. **이번 작업 범위 밖.**

따라서 페이지네이션은 **서버가 아니라 클라이언트 SQL 레벨**에서 처리한다.

## 범위

### 대상 (페이지네이션 적용)
- [`FuelList.jsx`](../../../frontend/src/pages/FuelList.jsx)
- [`MaintenanceList.jsx`](../../../frontend/src/pages/MaintenanceList.jsx)
- [`OtherList.jsx`](../../../frontend/src/pages/OtherList.jsx)

### 건드리지 않는 것 (기존 동작 보존)
"보여주기"와 "계산하기"를 분리하는 것이 핵심 원칙이다. 기존 전체조회 함수는 **그대로 두고**, 목록용 페이지 함수를 **신규 추가**한다.

| 용도 | 데이터 접근 | 변경 |
|---|---|---|
| 목록 표시 (List 3종) | `getXxxPage()` **신규**, 50개씩 | 신설 |
| 계산 (Form: 연비·직전기록) | `getFuel()` 등 전체조회 | 그대로 |
| 통계 (Home: 월 지출·평균연비) | `SELECT SUM/AVG` 집계 | 그대로 |

- 통계는 원래부터 SUM/AVG로 **결과값만** 반환하므로(행을 메모리로 끌어오지 않음) 페이지네이션과 무관하게 가볍다. 손대지 않는다.
- Form 계산용 전체조회를 페이지용으로 바꾸면 연비·통계가 조용히 깨진다. 반드시 신규 함수로 분리한다.

## 데이터 계층 설계 (`api.js`)

종류별로 페이지 함수를 신규 추가한다. fuel 예시:

```js
// 기존 getFuel() 전체조회는 그대로 유지. 아래는 신규 추가.
export async function getFuelPage({ cursor = null, limit = 50 }) {
  const db = getDB();
  let sql, params;
  if (!cursor) {
    sql = "SELECT * FROM fuel ORDER BY date DESC, id DESC LIMIT ?";
    params = [limit];
  } else {
    // 직전에 본 마지막 행보다 '뒤'(더 과거)에 오는 것만
    sql = "SELECT * FROM fuel WHERE date < ? OR (date = ? AND id < ?) " +
          "ORDER BY date DESC, id DESC LIMIT ?";
    params = [cursor.date, cursor.date, cursor.id, limit];
  }
  const rs = rows(await db.query(sql, params));
  const nextCursor = rs.length < limit
    ? null  // 가져온 행이 limit보다 적으면 마지막 페이지
    : { date: rs[rs.length - 1].date, id: rs[rs.length - 1].id };
  return { rows: rs, nextCursor };
}
```

`maintenance`·`other`도 동일 패턴으로 `getMaintenancePage`, `getOtherPage` 추가.

### 커서(keyset) 설계 근거
- 정렬은 기존과 동일하게 `ORDER BY date DESC, id DESC` 고정.
- 커서는 **`(date, id)` 복합키**. `date`만으로는 같은 날 여러 기록이 있을 때 누락·중복이 발생하므로 `id`를 보조키로 둔다.
- 경계 조건은 `WHERE date < ? OR (date = ? AND id < ?)` 로 표현한다. row-value 비교 `(date, id) < (?, ?)` 와 동치이지만 가독성을 위해 풀어 쓴 형태를 채택.
- **전제**: `date`는 ISO 형식(`YYYY-MM-DD`)으로 저장되어 사전순 = 시간순이 성립한다. 현재 production이 이 정렬로 동작 중이므로 안전. 향후 날짜 저장 포맷을 로컬라이즈 형식으로 바꾸면 이 방식이 깨지므로 ISO 고정을 유지한다.
- **page size 50**: 데이터가 적은 대부분의 사용자는 페이지네이션을 체감하지 못하고, 많이 누적된 경우에만 이득을 본다.

## 공통 훅 설계 (`usePaginatedList`)

세 목록의 동작이 거의 동일하므로 커스텀 훅으로 추출한다.

```js
function usePaginatedList(fetchPage) { ... }
// 반환: { records, hasMore, loading, sentinelRef, reset }
```

- 내부에 상태(`records`, `cursor`, `hasMore`, `loading`)와 `IntersectionObserver`를 캡슐화한다.
- **`fetchPage` 함수를 인자로 받는다** — 나중에 필터 기능을 얹을 때 훅 자체는 수정하지 않고, 넘기는 `fetchPage`에 WHERE 조건만 추가하면 된다. (필터는 이번에 구현하지 않지만, 구조가 막지 않도록 열어 둔다.)

### 스크롤 감지: IntersectionObserver
- 목록 맨 끝에 보이지 않는 **감지용 요소(sentinel)** 를 두고, 그 요소가 viewport에 진입하는 순간 `loadMore`를 1회 호출한다.
- 스크롤 이벤트 + 좌표 계산 방식과 달리 매 스크롤마다 계산이 돌지 않으며, **스크롤 속도와 무관**하게 위치 진입만으로 동작한다.

## List 컴포넌트 변경 + 갱신 규칙

```jsx
const { records, hasMore, loading, sentinelRef } =
  usePaginatedList(api.getFuelPage);
// ...records.map() 으로 렌더...
{hasMore && <div ref={sentinelRef} />}  // 감지용 sentinel
```

### 갱신 규칙 (중요 — 무한 스크롤이 가장 자주 깨지는 지점)
기존에는 마운트마다 `getFuel().then(setRecords)`로 전체를 새로 받아 추가·삭제가 자동 반영됐다. 페이지네이션은 `[records, cursor, hasMore]` 상태를 들고 있으므로 이 자동 반영이 사라진다. 따라서 명시적 규칙을 둔다:

- **마운트 시**: 첫 페이지(cursor=null)부터 로드.
- **추가·수정·삭제 후 목록으로 복귀 시**: 커서를 리셋하고 **맨 위부터 재로드**.
  - 새 기록은 최신 날짜라 1페이지 맨 위에 오므로, surgical update 대신 리셋-리로드가 정확하고 단순하다. (차계부 목록은 짧아서 이 방식의 비용이 무시할 수준.)

## 테스트 전략

`getXxxPage`의 커서 경계 로직을 sqlite-wasm 기반 단위 테스트로 검증한다:

- 첫 페이지가 정확히 limit개를 최신순으로 반환하는가.
- 커서 이후 페이지가 직전 페이지와 겹치거나 빠뜨리지 않는가 (특히 **같은 날 여러 건**).
- 마지막 페이지에서 `nextCursor === null`이 되는가 (행 수가 limit과 정확히 같을 때 / 적을 때 각각).

## 비범위 (이번에 하지 않는 것)

- **필터 기능**: 구조는 열어 두되 구현은 하지 않음 (YAGNI).
- **Form 계산용 전체조회 최적화**: `getFuel()` 전체 로드를 "직전 1건만 쿼리"로 바꾸는 것은 별도 작업.
- **레거시 FastAPI 백엔드 정리**: `main.py`의 죽은 CRUD 라우트 제거는 별도 작업.
- **목록 가상화(react-window 등)**: 전체 로드를 유지하는 방식이라 목적과 맞지 않아 제외.
