# Design Tokens 참조 시스템 — 설계 문서

**날짜:** 2026-07-08  
**프로젝트:** chapil (차량 관리 앱)  
**범위:** CSS 변수 체계 재편 + 인터랙티브 HTML 참조 페이지

---

## 목표

현재 `frontend/src/index.css`에 비체계적으로 정의된 CSS 변수들을 시맨틱 카테고리로 재편하고, 실제 컴포넌트 예시와 Do/Don't 가이드를 포함한 인터랙티브 HTML 참조 페이지를 `docs/tokens/`에 만든다.

---

## 아키텍처 결정

- **토큰 방식:** CSS Custom Properties (`var(--token-name)`) — Tailwind CSS 미사용
- **네이밍 전략:** 시맨틱 카테고리 prefix (MD3 영향, 현행 변수 수 유지)
- **참조 페이지:** 순수 HTML/CSS, JS 프레임워크 없음
- **위치:** `docs/tokens/index.html`, `docs/tokens/index.css`

---

## 섹션 1: 토큰 재편 계획

### 1-1. 카테고리별 분류

#### Surface (배경면)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--bg` | `--surface` | `#ffffff` | `#151515` |
| `--bg-sub` | `--surface-variant` | `#ececec` | `#383838` |
| `--bg-transparent` | `--surface-fade` | `rgba(255,255,255,0)` | `rgba(21,21,21,0)` |
| `--card` | `--surface-elevated` | `rgba(255,255,255,0.75)` | `rgba(32,32,32,0.9)` |

#### Accent (강조색)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--primary` | `--accent` | `rgba(32,128,225,0.75)` | `rgba(32,168,255,0.75)` |
| `--primary-dark` | `--accent-press` | `rgba(0,128,192,0.75)` | `rgba(32,128,192,0.75)` |

#### Semantic Color (의미 색상)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--danger` | `--color-danger` | `#ff3b30` | `#ffa558` |
| `--green` | `--color-success` | `#188038` | `#4b9476` |
| `--orange` | `--color-warning` | `#b06000` | `#a18d70` |

#### Typography (텍스트 색상)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--text` | `--on-surface` | `#232323` | `#ffffff` |
| `--text-sub` | `--on-surface-variant` | `#505050` | `#cccccc` |

#### State (인터랙션 상태)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--hover` | `--state-hover` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` |
| `--active` | `--state-active` | `rgba(128,128,128,0.1)` | `rgba(128,128,128,0.25)` |

#### Outline (테두리)
| 구 이름 | 새 이름 | 라이트 값 | 다크 값 |
|---|---|---|---|
| `--border` | `--outline` | `1px solid rgba(128,128,128,0.25)` | `1px solid rgba(96,96,96,0.25)` |
| `--border-sub` | *삭제* | — 코드베이스 내 실사용 없음 — | |
| `--border-point` | `--outline-strong` | `1px solid rgba(128,128,128,0.75)` | `1px solid rgba(96,96,96,1)` |

#### Elevation (그림자 / 블러)
| 구 이름 | 새 이름 | 값 |
|---|---|---|
| `--back-blur` | `--blur` | `blur(2.5px)` |
| `--shadow` | `--shadow` | `0 0 5px 0 rgba(0,0,0,0.15)` |
| `--shadow-hover` | `--shadow-hover` | `0 0 10px 0 rgba(0,0,0,0.2)` |
| `--shadow-active` | `--shadow-active` | `0 0 5px 0 rgba(0,0,0,0.25)` |

#### Shape (모서리 반경)
| 구 이름 | 새 이름 | 값 |
|---|---|---|
| `--radius-edge` | `--radius-sm` | `10px` |
| `--radius` | `--radius-lg` | `32px` |

#### Layout (크기 / 간격)
| 구 이름 | 새 이름 | 값 |
|---|---|---|
| `--nav-h` | `--size-nav` | `64px` |
| `--layout-w` | `--size-layout` | `600px` |
| `--safe-top` | `--safe-top` | `env(safe-area-inset-top, 0px)` |
| `--safe-bottom` | `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` |

---

## 섹션 2: 참조 페이지 구조

### 파일 위치
```
docs/
  tokens/
    index.html   ← 참조 페이지 본체
    index.css    ← 참조 페이지 전용 스타일 (chapil 토큰 포함)
```

### 페이지 구성
1. **헤더** — "Chapil Design Tokens" + 버전 + 라이트/다크 토글 버튼
2. **섹션 앵커 탭** — 8개 카테고리 빠른 이동
3. **토큰 섹션** (카테고리별) — 토큰 카드 + Do/Don't 블록
4. **푸터** — 마지막 업데이트 날짜

### 토큰 카드 구성 요소
- 색상 스와치 (라이트 / 다크 나란히)
- 토큰 이름 (`--surface-elevated`)
- CSS 값 (라이트 / 다크)
- 한 줄 설명

### 라이트/다크 토글
- 페이지 기본값은 `prefers-color-scheme` 자동 적용
- 토글 버튼으로 수동 전환 가능 (`data-theme` attribute 방식, JS 최소화)

---

## 섹션 3: Do / Don't 가이드

### Surface
- ✅ 페이지 배경 → `--surface` / 카드·패널·바텀시트 → `--surface-elevated`
- ✅ `--surface-elevated` 사용 시 반드시 `backdrop-filter: var(--blur)` 병행
- ❌ `--surface-elevated`를 body/page 배경 레벨에 사용 금지 (반투명 겹침 문제)

### Accent
- ✅ 버튼·활성 탭·포커스 테두리·링크에 사용
- ✅ 눌림 상태는 `--accent-press`로 전환
- ❌ 일반 텍스트에 accent 직접 적용 금지 — 강조는 font-weight으로

### Typography
- ✅ 본문 텍스트 → `--on-surface` / 보조·라벨 → `--on-surface-variant`
- ❌ 색상 하드코딩 금지 (`#232323`, `#ffffff` 등) — 다크모드 대응 불가

### State
- ✅ hover/active 배경은 `--state-hover` / `--state-active` 만 사용
- ❌ `opacity` 직접 조작 금지 — 배경색에 따라 결과가 다름

### Outline
- ✅ 카드·목록 구분선 → `--outline` / 버튼·강조 입력창 테두리 → `--outline-strong`
- ❌ 두 토큰 혼용 금지 — 시각 계층 혼란

### Elevation
- ✅ 떠있는 요소(nav, 모달, 버튼)에 `--shadow` 적용, 상태에 따라 단계적 전환
- ❌ `--blur`를 `--surface-elevated` 없이 단독 사용 금지 (내용 비침)

### Shape
- ✅ 입력창·작은 카드·드롭다운 → `--radius-sm` / 바텀탭·pill 버튼·토스트 → `--radius-lg`
- ❌ 같은 컴포넌트 그룹 내에서 두 반경 혼용 금지

### Semantic Color
- ✅ 삭제·위험 → `--color-danger` / 성공 → `--color-success` / 주의 → `--color-warning`
- ❌ 시맨틱 색상을 배경에 직접 사용 금지 — 텍스트·아이콘 색으로만, 배경은 별도 반투명 처리

---

## 구현 범위

1. `docs/tokens/index.html` + `docs/tokens/index.css` 신규 생성
2. `frontend/src/index.css` — 토큰 이름 일괄 교체 (구 이름 → 새 이름)
3. `frontend/src/` 전체 — `var(--구이름)` 참조 일괄 교체
4. `--border-sub` 정의 제거

## 구현 제외 범위

- App.css (Vite 기본 템플릿 잔재, chapil 토큰 미사용)
- 참조 페이지에 JS 프레임워크 도입 없음
