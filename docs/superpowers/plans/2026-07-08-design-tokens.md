# Design Tokens 참조 시스템 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSS 변수 이름을 시맨틱 체계로 재편하고, 실제 컴포넌트 예시·Do/Don't 가이드를 포함한 인터랙티브 HTML 참조 페이지를 만든다.

**Architecture:** `frontend/src/index.css`의 CSS 변수를 일괄 리네이밍 후, `docs/tokens/`에 동일 토큰 정의를 포함한 독립 참조 페이지(HTML/CSS)를 생성한다. JS 프레임워크 없이 순수 HTML/CSS + 최소 인라인 JS(라이트/다크 토글).

**Tech Stack:** CSS Custom Properties, HTML, 인라인 JS (패키지 추가 없음)

## Global Constraints

- JSX 파일에 `var(--*)` 직접 사용 없음 — `frontend/src/index.css`만 수정 대상
- `App.css`는 Vite 템플릿 잔재로 chapil 토큰 미사용, 수정 제외
- 참조 페이지는 앱 빌드 체인과 완전히 분리 (`docs/tokens/` 독립 파일)
- 다크모드: `prefers-color-scheme` 자동 적용 + `[data-theme]` 수동 토글 병행

---

## 파일 맵

| 작업 | 파일 |
|---|---|
| 수정 | `frontend/src/index.css` — 토큰 정의·사용처 일괄 리네이밍, `--border-sub` 삭제 |
| 신규 | `docs/tokens/index.css` — 새 토큰 정의 + 참조 페이지 전용 스타일 |
| 신규 | `docs/tokens/index.html` — 인터랙티브 참조 페이지 본체 |

---

## Task 1: frontend/src/index.css 토큰 리네이밍

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: 새 토큰 이름으로 교체된 `index.css`. 이후 Task 2/3에서 동일 이름 사용.

- [ ] **Step 1: 리네이밍 전 백업 생성**

```bash
cp frontend/src/index.css frontend/src/index.css.bak
```

- [ ] **Step 2: perl로 토큰 일괄 리네이밍**

반드시 아래 순서대로 실행 (긴 이름 먼저, 짧은 이름 나중).

```bash
cd /home/iranto/Gitea/chapil

# Surface 계열 (긴 이름 먼저)
perl -i -pe 's/--bg-transparent/--surface-fade/g' frontend/src/index.css
perl -i -pe 's/--bg-sub/--surface-variant/g' frontend/src/index.css
perl -i -pe 's/--bg\b/--surface/g' frontend/src/index.css
perl -i -pe 's/--card\b/--surface-elevated/g' frontend/src/index.css

# Accent 계열 (긴 이름 먼저)
perl -i -pe 's/--primary-dark/--accent-press/g' frontend/src/index.css
perl -i -pe 's/--primary\b/--accent/g' frontend/src/index.css

# Semantic 색상
perl -i -pe 's/--danger\b/--color-danger/g' frontend/src/index.css
perl -i -pe 's/--green\b/--color-success/g' frontend/src/index.css
perl -i -pe 's/--orange\b/--color-warning/g' frontend/src/index.css

# Typography (긴 이름 먼저)
perl -i -pe 's/--text-sub/--on-surface-variant/g' frontend/src/index.css
perl -i -pe 's/--text\b/--on-surface/g' frontend/src/index.css

# State
perl -i -pe 's/--hover\b/--state-hover/g' frontend/src/index.css
perl -i -pe 's/--active\b/--state-active/g' frontend/src/index.css

# Outline 계열 (긴 이름 먼저, --border-sub는 정의만 있으므로 삭제 처리)
perl -i -pe 's/--border-point/--outline-strong/g' frontend/src/index.css
perl -i -pe 's/--border\b/--outline/g' frontend/src/index.css

# Elevation
perl -i -pe 's/--back-blur/--blur/g' frontend/src/index.css

# Shape (긴 이름 먼저)
perl -i -pe 's/--radius-edge/--radius-sm/g' frontend/src/index.css
perl -i -pe 's/--radius(?!-)/--radius-lg/g' frontend/src/index.css

# Layout
perl -i -pe 's/--nav-h\b/--size-nav/g' frontend/src/index.css
perl -i -pe 's/--layout-w\b/--size-layout/g' frontend/src/index.css
```

- [ ] **Step 3: --border-sub 정의 줄 삭제**

`--border-sub`는 정의만 있고 코드베이스 전체에서 실사용 없음. 정의 줄을 삭제한다.

```bash
perl -i -ne 'print unless /--border-sub/' frontend/src/index.css
```

- [ ] **Step 4: 리네이밍 결과 검증**

```bash
# 구 이름이 남아있으면 안 됨 (0이어야 함)
grep -c "\-\-bg\b\|\-\-card\b\|\-\-primary\b\|\-\-text\b\|\-\-hover\b\|\-\-active\b\|\-\-border\b\|\-\-back-blur\|\-\-radius-edge\|\-\-nav-h\|\-\-layout-w\|\-\-danger\b\|\-\-green\b\|\-\-orange\b\|\-\-border-sub" frontend/src/index.css || true

# 새 이름이 존재해야 함 (0이면 안 됨)
grep -c "\-\-surface\|\-\-accent\|\-\-on-surface\|\-\-state-hover\|\-\-outline\|\-\-blur\|\-\-radius-sm\|\-\-size-nav" frontend/src/index.css
```

예상 출력: 첫 번째 명령 `0`, 두 번째 명령 `30` 이상.

- [ ] **Step 5: :root 블록이 올바른지 확인**

```bash
grep -A 40 '^:root {' frontend/src/index.css | head -45
```

예상 출력 (아래 토큰들이 있어야 함):
```
:root {
  --surface: #ffffff;
  --surface-variant: #ececec;
  --surface-fade: rgba(255,255,255,0);
  --blur: blur(2.5px);
  --surface-elevated: rgba(255,255,255,0.75);
  --state-hover: rgba(0,0,0,0.05);
  --state-active: rgba(128,128,128,0.1);
  --accent: rgba(32,128,225,0.75);
  --accent-press: rgba(0,128,192,0.75);
  --color-danger: #ff3b30;
  --color-success: #188038;
  --color-warning: #b06000;
  --on-surface: #232323;
  --on-surface-variant: #505050;
  --outline: 1px solid rgba(128,128,128,0.25);
  --outline-strong: 1px solid rgba(128,128,128,0.75);
  --shadow: 0 0 5px 0 rgba(0,0,0,0.15);
  --shadow-hover: 0 0 10px 0 rgba(0,0,0,0.2);
  --shadow-active: 0 0 5px 0 rgba(0,0,0,0.25);
  --radius-sm: 10px;
  --radius-lg: 32px;
  --size-nav: 64px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --size-layout: 600px;
}
```

- [ ] **Step 6: 앱 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

예상 출력: `built in` 포함, `error` 없음.

- [ ] **Step 7: 백업 삭제 후 커밋**

```bash
rm frontend/src/index.css.bak
git add frontend/src/index.css
git commit -m "refactor: rename CSS tokens to semantic naming system

- --bg* → --surface* (surface, surface-variant, surface-fade, surface-elevated)
- --primary* → --accent* (accent, accent-press)
- --text* → --on-surface* (on-surface, on-surface-variant)
- --hover/--active → --state-hover/--state-active
- --border* → --outline* (outline, outline-strong); remove unused --border-sub
- --back-blur → --blur
- --radius-edge/--radius → --radius-sm/--radius-lg
- --nav-h/--layout-w → --size-nav/--size-layout
- --danger/--green/--orange → --color-danger/--color-success/--color-warning"
```

---

## Task 2: docs/tokens/index.css 생성

**Files:**
- Create: `docs/tokens/index.css`

**Interfaces:**
- Produces: 토큰 정의 + 참조 페이지 레이아웃 스타일. `index.html`에서 `<link>`로 로드.

- [ ] **Step 1: docs/tokens 디렉토리 생성**

```bash
mkdir -p docs/tokens
```

- [ ] **Step 2: docs/tokens/index.css 작성**

아래 내용을 `docs/tokens/index.css`로 저장:

```css
/* =============================================
   CHAPIL DESIGN TOKENS — Reference Page
   docs/tokens/index.css
   ============================================= */

/* ---- Token Definitions ---- */
:root {
  /* Surface */
  --surface: #ffffff;
  --surface-variant: #ececec;
  --surface-fade: rgba(255,255,255,0);
  --surface-elevated: rgba(255,255,255,0.75);

  /* Accent */
  --accent: rgba(32,128,225,0.75);
  --accent-press: rgba(0,128,192,0.75);

  /* Semantic Color */
  --color-danger: #ff3b30;
  --color-success: #188038;
  --color-warning: #b06000;

  /* Typography */
  --on-surface: #232323;
  --on-surface-variant: #505050;

  /* State */
  --state-hover: rgba(0,0,0,0.05);
  --state-active: rgba(128,128,128,0.1);

  /* Outline */
  --outline: 1px solid rgba(128,128,128,0.25);
  --outline-strong: 1px solid rgba(128,128,128,0.75);

  /* Elevation */
  --blur: blur(2.5px);
  --shadow: 0 0 5px 0 rgba(0,0,0,0.15);
  --shadow-hover: 0 0 10px 0 rgba(0,0,0,0.2);
  --shadow-active: 0 0 5px 0 rgba(0,0,0,0.25);

  /* Shape */
  --radius-sm: 10px;
  --radius-lg: 32px;

  /* Layout */
  --size-nav: 64px;
  --size-layout: 600px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* Dark mode: system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #151515;
    --surface-variant: #383838;
    --surface-fade: rgba(21,21,21,0);
    --surface-elevated: rgba(32,32,32,0.9);
    --accent: rgba(32,168,255,0.75);
    --accent-press: rgba(32,128,192,0.75);
    --color-danger: #ffa558;
    --color-success: #4b9476;
    --color-warning: #a18d70;
    --on-surface: #ffffff;
    --on-surface-variant: #cccccc;
    --outline: 1px solid rgba(96,96,96,0.25);
    --outline-strong: 1px solid rgba(96,96,96,1);
  }
}

/* Dark mode: manual toggle */
[data-theme="dark"] {
  color-scheme: dark;
  --surface: #151515;
  --surface-variant: #383838;
  --surface-fade: rgba(21,21,21,0);
  --surface-elevated: rgba(32,32,32,0.9);
  --accent: rgba(32,168,255,0.75);
  --accent-press: rgba(32,128,192,0.75);
  --color-danger: #ffa558;
  --color-success: #4b9476;
  --color-warning: #a18d70;
  --on-surface: #ffffff;
  --on-surface-variant: #cccccc;
  --outline: 1px solid rgba(96,96,96,0.25);
  --outline-strong: 1px solid rgba(96,96,96,1);
}

/* Light mode: manual override */
[data-theme="light"] {
  color-scheme: light;
}

/* ---- Reference Page Layout ---- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', 'Segoe UI', sans-serif;
  background: var(--surface);
  color: var(--on-surface);
  line-height: 1.6;
  min-height: 100vh;
}

/* Header */
.page-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--surface-elevated);
  backdrop-filter: var(--blur);
  border-bottom: var(--outline);
  box-shadow: var(--shadow);
}
.header-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.page-header h1 { font-size: 18px; font-weight: 700; }
.version {
  font-size: 12px; color: var(--on-surface-variant);
  margin-left: 8px; font-weight: 400;
}
.theme-toggle {
  padding: 6px 14px;
  background: var(--surface-variant);
  border: var(--outline-strong);
  border-radius: var(--radius-sm);
  color: var(--on-surface);
  font-size: 13px; cursor: pointer;
  box-shadow: none; transition: background 0.15s;
}
.theme-toggle:hover { background: var(--state-hover); }

/* Nav */
.token-nav {
  position: sticky; top: 53px; z-index: 90;
  background: var(--surface);
  border-bottom: var(--outline);
  overflow-x: auto; display: flex;
  scrollbar-width: none;
}
.token-nav::-webkit-scrollbar { display: none; }
.token-nav a {
  padding: 10px 16px;
  font-size: 13px; font-weight: 500;
  color: var(--on-surface-variant);
  white-space: nowrap; text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.token-nav a:hover {
  color: var(--on-surface);
  background: var(--state-hover);
  border-bottom-color: var(--accent);
}

/* Main */
.page-main { max-width: 1200px; margin: 0 auto; padding: 0 24px 80px; }

/* Section */
.token-section { padding: 48px 0 32px; border-bottom: var(--outline); }
.token-section:last-child { border-bottom: none; }
.token-section > h2 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
.section-desc {
  font-size: 14px; color: var(--on-surface-variant);
  margin-bottom: 24px; max-width: 600px;
}

/* Token Grid */
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px; margin-bottom: 32px;
}

/* Token Card */
.token-card {
  background: var(--surface-elevated);
  backdrop-filter: var(--blur);
  border: var(--outline);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
}

/* Swatch */
.swatch-row { display: flex; gap: 6px; height: 48px; }
.swatch { flex: 1; border-radius: 6px; }
.swatch-label {
  font-size: 10px; color: var(--on-surface-variant);
  text-align: center; margin-top: 3px; letter-spacing: 0.5px;
}
.checkered {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  border-radius: 6px; overflow: hidden;
}
.transparent-swatch { flex: 1; }

/* Token Meta */
.token-meta { display: flex; flex-direction: column; gap: 4px; }
.token-name {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 13px; font-weight: 700;
  color: var(--accent); margin-bottom: 2px;
}
.token-values {
  display: flex; flex-direction: column; gap: 1px;
  font-family: 'Courier New', monospace;
  font-size: 11px; color: var(--on-surface-variant);
}
.token-meta > p { font-size: 12px; color: var(--on-surface-variant); margin-top: 4px; }

/* Do / Don't */
.do-dont {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  margin-top: 8px;
}
@media (max-width: 600px) { .do-dont { grid-template-columns: 1fr; } }

.do-block, .dont-block {
  border-radius: var(--radius-sm); overflow: hidden;
  border: var(--outline);
}
.do-block { border-color: rgba(24,128,56,0.4); }
.dont-block { border-color: rgba(255,59,48,0.3); }

.do-dont-label {
  padding: 6px 12px;
  font-size: 13px; font-weight: 700;
}
.do-label { background: rgba(24,128,56,0.1); color: var(--color-success); }
.dont-label { background: rgba(255,59,48,0.08); color: var(--color-danger); }

.do-dont-example {
  padding: 16px; background: var(--surface);
  min-height: 80px; display: flex; align-items: center;
}
.do-dont-desc {
  padding: 10px 12px;
  font-size: 12px; color: var(--on-surface-variant);
  background: var(--surface-variant);
  border-top: var(--outline); line-height: 1.5;
}
.do-dont-desc code {
  font-family: 'Courier New', monospace; font-size: 11px;
  background: var(--surface-elevated);
  padding: 1px 5px; border-radius: 3px;
  border: var(--outline-strong); color: var(--accent);
}

/* State demo */
.state-demo-item {
  padding: 12px 20px; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 14px; color: var(--on-surface);
  border: var(--outline); transition: background 0.15s; user-select: none;
  width: 100%;
}
.state-demo-item:hover { background: var(--state-hover); }
.state-demo-item:active { background: var(--state-active); }

/* Footer */
.page-footer {
  text-align: center; padding: 24px;
  font-size: 12px; color: var(--on-surface-variant);
  border-top: var(--outline);
}
```

- [ ] **Step 3: 커밋**

```bash
git add docs/tokens/index.css
git commit -m "feat: add design tokens reference page stylesheet"
```

---

## Task 3: docs/tokens/index.html 생성

**Files:**
- Create: `docs/tokens/index.html`

**Interfaces:**
- Consumes: `docs/tokens/index.css` (Task 2)
- Produces: 브라우저에서 바로 열 수 있는 완성된 참조 페이지

- [ ] **Step 1: docs/tokens/index.html 작성**

아래 내용을 `docs/tokens/index.html`로 저장:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chapil Design Tokens</title>
  <link rel="stylesheet" href="index.css">
</head>
<body>

<header class="page-header">
  <div class="header-inner">
    <div>
      <span style="font-size:18px;font-weight:700;">Chapil</span>
      <span style="font-size:18px;font-weight:300;"> Design Tokens</span>
      <span class="version">v26.x</span>
    </div>
    <button class="theme-toggle" id="theme-toggle">🌙 다크</button>
  </div>
</header>

<nav class="token-nav">
  <a href="#surface">Surface</a>
  <a href="#accent">Accent</a>
  <a href="#semantic">Semantic</a>
  <a href="#typography">Typography</a>
  <a href="#state">State</a>
  <a href="#outline">Outline</a>
  <a href="#elevation">Elevation</a>
  <a href="#shape">Shape</a>
  <a href="#layout">Layout</a>
</nav>

<main class="page-main">

  <!-- ================================ SURFACE ================================ -->
  <section class="token-section" id="surface">
    <h2>Surface</h2>
    <p class="section-desc">배경면 레이어를 정의하는 토큰. 페이지 배경, 카드, 패널의 시각적 깊이를 표현한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#ffffff;border:1px solid #ddd;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#151515;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--surface</code>
          <div class="token-values">
            <span>Light: <b>#ffffff</b></span>
            <span>Dark: <b>#151515</b></span>
          </div>
          <p>앱 전체의 기본 배경면. body에 직접 적용.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#ececec;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#383838;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--surface-variant</code>
          <div class="token-values">
            <span>Light: <b>#ececec</b></span>
            <span>Dark: <b>#383838</b></span>
          </div>
          <p>보조 배경면. 입력창, 코드 블록, 구분 영역.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:rgba(255,255,255,0.75);border:1px solid #ddd;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:rgba(32,32,32,0.9);"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--surface-elevated</code>
          <div class="token-values">
            <span>Light: <b>rgba(255,255,255,0.75)</b></span>
            <span>Dark: <b>rgba(32,32,32,0.9)</b></span>
          </div>
          <p>카드·바텀시트·모달. 반드시 <code style="font-size:11px;">--blur</code>와 세트.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row checkered">
          <div class="transparent-swatch"></div>
        </div>
        <div class="token-meta">
          <code class="token-name">--surface-fade</code>
          <div class="token-values">
            <span>Light: <b>rgba(255,255,255,0)</b></span>
            <span>Dark: <b>rgba(21,21,21,0)</b></span>
          </div>
          <p>그라디언트 끝점 전용. topbar·bottom-bg의 linear-gradient 종단점.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example">
          <div style="background:var(--surface);padding:12px;width:100%;border-radius:var(--radius-sm);">
            <div style="background:var(--surface-elevated);backdrop-filter:var(--blur);padding:12px;border-radius:var(--radius-sm);border:var(--outline);box-shadow:var(--shadow);font-size:13px;color:var(--on-surface);">
              카드 → surface-elevated + blur + shadow
            </div>
          </div>
        </div>
        <p class="do-dont-desc"><code>--surface-elevated</code>를 배경으로, <code>--blur</code>와 <code>--shadow</code> 함께 사용.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example">
          <div style="background:rgba(255,255,255,0.75);padding:12px;width:100%;border-radius:var(--radius-sm);">
            <div style="background:rgba(255,255,255,0.75);padding:12px;border-radius:var(--radius-sm);font-size:13px;color:#232323;">
              페이지 배경에 surface-elevated → 반투명 중첩
            </div>
          </div>
        </div>
        <p class="do-dont-desc">페이지·body 배경에 <code>--surface-elevated</code> 금지. 반투명 중첩 시 색상이 뭉침.</p>
      </div>
    </div>
  </section>

  <!-- ================================ ACCENT ================================ -->
  <section class="token-section" id="accent">
    <h2>Accent</h2>
    <p class="section-desc">브랜드 강조색. 버튼·활성 탭·포커스 등 인터랙티브 요소에 사용한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:rgba(32,128,225,0.75);"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:rgba(32,168,255,0.75);"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--accent</code>
          <div class="token-values">
            <span>Light: <b>rgba(32,128,225,0.75)</b></span>
            <span>Dark: <b>rgba(32,168,255,0.75)</b></span>
          </div>
          <p>기본 강조색. 버튼 배경, 활성 탭, 입력 포커스 테두리.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:rgba(0,128,192,0.75);"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:rgba(32,128,192,0.75);"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--accent-press</code>
          <div class="token-values">
            <span>Light: <b>rgba(0,128,192,0.75)</b></span>
            <span>Dark: <b>rgba(32,128,192,0.75)</b></span>
          </div>
          <p>눌림(active) 상태 강조색. :active 또는 버튼 press 시 전환.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example">
          <button style="background:var(--accent);color:#fff;border:none;padding:10px 24px;border-radius:var(--radius-lg);font-size:15px;font-weight:600;cursor:pointer;">확인</button>
        </div>
        <p class="do-dont-desc">버튼 배경 <code>--accent</code>, 텍스트는 <code>#fff</code> 고정 (accent 위 대비색).</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example">
          <p style="color:var(--accent);font-size:15px;">일반 본문 텍스트에 accent 색상 적용</p>
        </div>
        <p class="do-dont-desc">일반 텍스트에 <code>--accent</code> 금지. 강조는 font-weight으로 표현할 것.</p>
      </div>
    </div>
  </section>

  <!-- ================================ SEMANTIC ================================ -->
  <section class="token-section" id="semantic">
    <h2>Semantic Color</h2>
    <p class="section-desc">상태와 의미를 전달하는 색상. 텍스트·아이콘 색으로만 사용하며 배경에 직접 적용하지 않는다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#ff3b30;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#ffa558;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--color-danger</code>
          <div class="token-values">
            <span>Light: <b>#ff3b30</b></span>
            <span>Dark: <b>#ffa558</b></span>
          </div>
          <p>삭제·경고·위험 동작. 더보기 메뉴 삭제 버튼, 폼 에러 메시지.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#188038;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#4b9476;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--color-success</code>
          <div class="token-values">
            <span>Light: <b>#188038</b></span>
            <span>Dark: <b>#4b9476</b></span>
          </div>
          <p>성공·긍정 상태. 배지 green 변형, 완료 표시.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#b06000;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#a18d70;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--color-warning</code>
          <div class="token-values">
            <span>Light: <b>#b06000</b></span>
            <span>Dark: <b>#a18d70</b></span>
          </div>
          <p>주의·점검 필요 상태. 배지 orange 변형.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example" style="gap:6px;flex-wrap:wrap;">
          <span style="background:rgba(24,128,56,0.12);color:#188038;border-radius:2px;padding:2px 8px;font-size:12px;font-weight:700;">정상</span>
          <span style="background:rgba(176,96,0,0.12);color:#b06000;border-radius:2px;padding:2px 8px;font-size:12px;font-weight:700;">점검필요</span>
          <span style="background:rgba(255,59,48,0.1);color:#ff3b30;border-radius:2px;padding:2px 8px;font-size:12px;font-weight:700;">위험</span>
        </div>
        <p class="do-dont-desc">시맨틱 색상을 텍스트 색으로, 배경은 같은 색의 반투명 처리.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example">
          <div style="background:#ff3b30;color:#fff;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;">배경에 직접 사용</div>
        </div>
        <p class="do-dont-desc">시맨틱 색상을 배경으로 직접 사용 금지. 다크모드 시 대비가 깨짐.</p>
      </div>
    </div>
  </section>

  <!-- ================================ TYPOGRAPHY ================================ -->
  <section class="token-section" id="typography">
    <h2>Typography</h2>
    <p class="section-desc">텍스트 색상 토큰. 색상 하드코딩 없이 반드시 이 토큰을 사용한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#232323;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#ffffff;border:1px solid #555;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--on-surface</code>
          <div class="token-values">
            <span>Light: <b>#232323</b></span>
            <span>Dark: <b>#ffffff</b></span>
          </div>
          <p>기본 본문 텍스트. 제목·주요 내용.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:#505050;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:#cccccc;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--on-surface-variant</code>
          <div class="token-values">
            <span>Light: <b>#505050</b></span>
            <span>Dark: <b>#cccccc</b></span>
          </div>
          <p>보조 텍스트. 라벨·날짜·메타 정보·placeholder.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example" style="flex-direction:column;align-items:flex-start;gap:4px;">
          <p style="color:var(--on-surface);font-size:15px;font-weight:600;">차량 정비 기록</p>
          <p style="color:var(--on-surface-variant);font-size:13px;">2026-07-08 · 엔진오일 교환</p>
        </div>
        <p class="do-dont-desc">제목 <code>--on-surface</code>, 보조 정보 <code>--on-surface-variant</code>.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example" style="flex-direction:column;align-items:flex-start;gap:4px;">
          <p style="color:#232323;font-size:15px;font-weight:600;">차량 정비 기록</p>
          <p style="color:#505050;font-size:13px;">하드코딩된 색상 (다크모드 대응 불가)</p>
        </div>
        <p class="do-dont-desc"><code>#232323</code> 등 직접 하드코딩 금지. 다크모드 자동 대응 불가.</p>
      </div>
    </div>
  </section>

  <!-- ================================ STATE ================================ -->
  <section class="token-section" id="state">
    <h2>State</h2>
    <p class="section-desc">hover·active 인터랙션 상태의 반투명 오버레이 토큰. opacity 직접 조작을 대체한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:rgba(0,0,0,0.05);border:1px solid #ddd;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:rgba(255,255,255,0.05);border:1px solid #444;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--state-hover</code>
          <div class="token-values">
            <span>Light: <b>rgba(0,0,0,0.05)</b></span>
            <span>Dark: <b>rgba(255,255,255,0.05)</b></span>
          </div>
          <p>마우스 올림 상태 배경. :hover에 적용.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="swatch-row">
          <div>
            <div class="swatch" style="background:rgba(128,128,128,0.1);border:1px solid #ddd;"></div>
            <div class="swatch-label">Light</div>
          </div>
          <div>
            <div class="swatch" style="background:rgba(128,128,128,0.25);border:1px solid #444;"></div>
            <div class="swatch-label">Dark</div>
          </div>
        </div>
        <div class="token-meta">
          <code class="token-name">--state-active</code>
          <div class="token-values">
            <span>Light: <b>rgba(128,128,128,0.1)</b></span>
            <span>Dark: <b>rgba(128,128,128,0.25)</b></span>
          </div>
          <p>눌림·선택 상태 배경. :active, .active에 적용.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example">
          <div class="state-demo-item">hover · active 해보기</div>
        </div>
        <p class="do-dont-desc"><code>:hover → --state-hover</code>, <code>:active → --state-active</code> 배경 적용.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example">
          <div style="padding:12px 20px;border-radius:var(--radius-sm);cursor:pointer;font-size:14px;color:var(--on-surface-variant);border:var(--outline);transition:opacity 0.15s;width:100%;text-align:left;"
               onmouseover="this.style.opacity='0.5'" onmouseout="this.style.opacity='1'">
            opacity로 hover 처리 (마우스 올려보기)
          </div>
        </div>
        <p class="do-dont-desc"><code>opacity</code> 직접 조작 금지. 배경색에 따라 결과가 달라짐.</p>
      </div>
    </div>
  </section>

  <!-- ================================ OUTLINE ================================ -->
  <section class="token-section" id="outline">
    <h2>Outline</h2>
    <p class="section-desc">구분선과 테두리 토큰. 두 단계로 시각 계층을 표현한다. 두 토큰을 혼용하지 않는다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div style="border:1px solid rgba(128,128,128,0.25);border-radius:var(--radius-sm);padding:10px;text-align:center;font-size:13px;color:var(--on-surface-variant);margin-bottom:8px;">미리보기</div>
        <div class="token-meta">
          <code class="token-name">--outline</code>
          <div class="token-values">
            <span>Light: <b>1px solid rgba(128,128,128,0.25)</b></span>
            <span>Dark: <b>1px solid rgba(96,96,96,0.25)</b></span>
          </div>
          <p>카드 테두리, 목록 구분선, 섹션 경계.</p>
        </div>
      </div>

      <div class="token-card">
        <div style="border:1px solid rgba(128,128,128,0.75);border-radius:var(--radius-sm);padding:10px;text-align:center;font-size:13px;color:var(--on-surface-variant);margin-bottom:8px;">미리보기</div>
        <div class="token-meta">
          <code class="token-name">--outline-strong</code>
          <div class="token-values">
            <span>Light: <b>1px solid rgba(128,128,128,0.75)</b></span>
            <span>Dark: <b>1px solid rgba(96,96,96,1)</b></span>
          </div>
          <p>강조 테두리. 버튼(.btn), 입력창 포커스.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example" style="flex-direction:column;gap:8px;width:100%;">
          <div style="border:1px solid rgba(128,128,128,0.25);padding:8px 12px;border-radius:var(--radius-sm);font-size:13px;">목록 카드 → outline</div>
          <button style="border:1px solid rgba(128,128,128,0.75);background:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:13px;cursor:pointer;color:var(--on-surface-variant);">버튼 → outline-strong</button>
        </div>
        <p class="do-dont-desc">목록·카드 <code>--outline</code>, 버튼·입력 강조 <code>--outline-strong</code>.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example" style="flex-direction:column;gap:8px;width:100%;">
          <div style="border:1px solid rgba(128,128,128,0.75);padding:8px 12px;border-radius:var(--radius-sm);font-size:13px;">목록 카드에 outline-strong</div>
          <button style="border:1px solid rgba(128,128,128,0.25);background:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:13px;cursor:pointer;color:var(--on-surface-variant);">버튼에 outline</button>
        </div>
        <p class="do-dont-desc">혼용 시 시각 계층이 평탄해져 UI 구조가 읽히지 않음.</p>
      </div>
    </div>
  </section>

  <!-- ================================ ELEVATION ================================ -->
  <section class="token-section" id="elevation">
    <h2>Elevation</h2>
    <p class="section-desc">그림자와 블러로 레이어의 높이를 표현한다. --blur는 반드시 --surface-elevated와 세트로 사용한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="token-meta">
          <code class="token-name">--blur</code>
          <div class="token-values"><span><b>blur(2.5px)</b></span></div>
          <p>backdrop-filter 전용값. glassmorphism 효과. --surface-elevated 없이 단독 사용 금지.</p>
        </div>
      </div>

      <div class="token-card">
        <div style="background:var(--surface-elevated);backdrop-filter:var(--blur);border:var(--outline);border-radius:var(--radius-sm);padding:10px;text-align:center;font-size:13px;box-shadow:0 0 5px 0 rgba(0,0,0,0.15);margin-bottom:8px;">--shadow</div>
        <div class="token-meta">
          <code class="token-name">--shadow</code>
          <div class="token-values"><span><b>0 0 5px 0 rgba(0,0,0,0.15)</b></span></div>
          <p>기본 상태 그림자.</p>
        </div>
      </div>

      <div class="token-card">
        <div style="background:var(--surface-elevated);backdrop-filter:var(--blur);border:var(--outline);border-radius:var(--radius-sm);padding:10px;text-align:center;font-size:13px;box-shadow:0 0 10px 0 rgba(0,0,0,0.2);margin-bottom:8px;">--shadow-hover</div>
        <div class="token-meta">
          <code class="token-name">--shadow-hover</code>
          <div class="token-values"><span><b>0 0 10px 0 rgba(0,0,0,0.2)</b></span></div>
          <p>hover 상태 그림자. shadow보다 넓게 퍼짐.</p>
        </div>
      </div>

      <div class="token-card">
        <div style="background:var(--surface-elevated);backdrop-filter:var(--blur);border:var(--outline);border-radius:var(--radius-sm);padding:10px;text-align:center;font-size:13px;box-shadow:0 0 5px 0 rgba(0,0,0,0.25);margin-bottom:8px;">--shadow-active</div>
        <div class="token-meta">
          <code class="token-name">--shadow-active</code>
          <div class="token-values"><span><b>0 0 5px 0 rgba(0,0,0,0.25)</b></span></div>
          <p>active 상태 그림자. shadow보다 강도 높고 범위 좁음.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example">
          <div style="background:var(--surface-elevated);backdrop-filter:var(--blur);border:var(--outline);border-radius:var(--radius-sm);padding:12px;box-shadow:var(--shadow);font-size:13px;color:var(--on-surface);width:100%;">
            surface-elevated + blur + shadow
          </div>
        </div>
        <p class="do-dont-desc"><code>--blur</code>는 <code>--surface-elevated</code>와 반드시 세트로 사용.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example">
          <div style="backdrop-filter:blur(2.5px);border:var(--outline);border-radius:var(--radius-sm);padding:12px;box-shadow:var(--shadow);font-size:13px;color:var(--on-surface);width:100%;">
            blur만 적용 → 뒤 내용이 비침
          </div>
        </div>
        <p class="do-dont-desc"><code>--blur</code> 단독 사용 금지. 면(surface-elevated) 없이 블러만 적용하면 뒤 콘텐츠가 비쳐 가독성 손상.</p>
      </div>
    </div>
  </section>

  <!-- ================================ SHAPE ================================ -->
  <section class="token-section" id="shape">
    <h2>Shape</h2>
    <p class="section-desc">모서리 반경 토큰. 컴포넌트 크기와 역할에 따라 두 단계로 구분한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div style="background:var(--surface-variant);border-radius:10px;padding:20px;text-align:center;font-size:13px;color:var(--on-surface-variant);margin-bottom:8px;">radius-sm</div>
        <div class="token-meta">
          <code class="token-name">--radius-sm</code>
          <div class="token-values"><span><b>10px</b></span></div>
          <p>입력창, 작은 카드, 드롭다운, 배지.</p>
        </div>
      </div>

      <div class="token-card">
        <div style="background:var(--surface-variant);border-radius:32px;padding:20px;text-align:center;font-size:13px;color:var(--on-surface-variant);margin-bottom:8px;">radius-lg</div>
        <div class="token-meta">
          <code class="token-name">--radius-lg</code>
          <div class="token-values"><span><b>32px</b></span></div>
          <p>바텀탭, pill 버튼, 토스트 알림, 온보딩 버튼.</p>
        </div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-block">
        <div class="do-dont-label do-label">✅ Do</div>
        <div class="do-dont-example" style="flex-direction:column;gap:10px;align-items:flex-start;width:100%;">
          <input type="text" placeholder="입력창 → radius-sm" style="border:var(--outline-strong);border-radius:var(--radius-sm);padding:8px 12px;background:var(--surface-elevated);color:var(--on-surface);outline:none;font-size:14px;width:100%;">
          <button style="background:var(--accent);color:#fff;border:none;padding:10px 24px;border-radius:var(--radius-lg);font-size:14px;font-weight:600;cursor:pointer;">pill 버튼 → radius-lg</button>
        </div>
        <p class="do-dont-desc">입력창 <code>--radius-sm</code>, pill 버튼 <code>--radius-lg</code>.</p>
      </div>
      <div class="dont-block">
        <div class="do-dont-label dont-label">❌ Don't</div>
        <div class="do-dont-example" style="flex-direction:column;gap:10px;align-items:flex-start;width:100%;">
          <input type="text" placeholder="입력창에 radius-lg (과한 곡률)" style="border:var(--outline-strong);border-radius:32px;padding:8px 12px;background:var(--surface-elevated);color:var(--on-surface);outline:none;font-size:14px;width:100%;">
          <button style="background:var(--accent);color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">버튼에 radius-sm</button>
        </div>
        <p class="do-dont-desc">컴포넌트 그룹 내 반경 혼용 금지. 시각 언어 충돌.</p>
      </div>
    </div>
  </section>

  <!-- ================================ LAYOUT ================================ -->
  <section class="token-section" id="layout">
    <h2>Layout</h2>
    <p class="section-desc">레이아웃 크기와 iOS safe area 토큰. 직접 수정하지 않고 참조만 한다.</p>

    <div class="token-grid">
      <div class="token-card">
        <div class="token-meta">
          <code class="token-name">--size-nav</code>
          <div class="token-values"><span><b>64px</b></span></div>
          <p>바텀 내비게이션 높이. content의 padding-bottom 계산에 사용.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="token-meta">
          <code class="token-name">--size-layout</code>
          <div class="token-values"><span><b>600px</b></span></div>
          <p>콘텐츠 최대 너비. max-width에 적용해 태블릿·데스크탑 레이아웃을 제한.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="token-meta">
          <code class="token-name">--safe-top</code>
          <div class="token-values"><span><b>env(safe-area-inset-top, 0px)</b></span></div>
          <p>iOS 노치·Dynamic Island 상단 여백. topbar padding에 사용.</p>
        </div>
      </div>

      <div class="token-card">
        <div class="token-meta">
          <code class="token-name">--safe-bottom</code>
          <div class="token-values"><span><b>env(safe-area-inset-bottom, 0px)</b></span></div>
          <p>iOS 홈 인디케이터 하단 여백. bottom-nav margin에 사용.</p>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="page-footer">
  <p>Chapil Design Tokens · 최종 업데이트: 2026-07-08</p>
</footer>

<script>
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');

  const isDark = () =>
    html.getAttribute('data-theme') === 'dark' ||
    (!html.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  btn.textContent = isDark() ? '☀️ 라이트' : '🌙 다크';

  btn.addEventListener('click', () => {
    html.setAttribute('data-theme', isDark() ? 'light' : 'dark');
    btn.textContent = isDark() ? '☀️ 라이트' : '🌙 다크';
  });
</script>

</body>
</html>
```

- [ ] **Step 2: 브라우저에서 열어 시각 확인**

```bash
xdg-open docs/tokens/index.html
```

확인 항목:
- 8개 섹션 모두 표시됨
- 라이트/다크 토글 버튼 동작
- Do/Don't 예시 컴포넌트가 실제로 렌더링됨 (빈 박스 없음)
- Surface 섹션의 glassmorphism 예시 (surface-elevated + blur)가 정상 표시됨

- [ ] **Step 3: 커밋**

```bash
git add docs/tokens/index.html
git commit -m "feat: add design tokens interactive reference page"
```

---

## 셀프 리뷰

**스펙 커버리지 체크:**
- [x] CSS 토큰 리네이밍 → Task 1
- [x] `--border-sub` 삭제 → Task 1 Step 3
- [x] `docs/tokens/index.html` + `index.css` 신규 생성 → Task 2, 3
- [x] 라이트/다크 토글 → Task 3 (JS 인라인)
- [x] 8개 카테고리 모두 포함 → Task 3
- [x] Do/Don't 블록 → Task 3 (각 섹션)
- [x] App.css 제외 → 수정 대상에 포함 안 됨

**Placeholder 스캔:** 없음. 모든 코드 블록 완성됨.

**타입 일관성:** CSS 변수 이름이 Task 1 (리네이밍)과 Task 2/3 (참조 페이지)에서 동일하게 사용됨.
