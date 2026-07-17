# 백엔드 정리 및 복구코드 백업 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chapil 백엔드(`app/`)에서 프론트엔드가 더 이상 호출하지 않는 죽은 CRUD/가져오기·내보내기/이미지 코드를 제거하고, 로그인 없이 코드 하나로 자체 호스팅 서버에 암호화된 데이터를 백업/복원하는 "복구코드" 시스템을 추가한다.

**Architecture:** 백엔드는 정적 파일 서빙 + 데모 시딩 + `recovery_backups` 단일 테이블 기반 PUT/GET/DELETE API 3개로 축소된다. 프론트엔드는 `crypto.subtle`(Web Crypto API)로 코드에서 조회키(SHA-256)와 암호화키(HKDF)를 분리 파생시켜 AES-GCM으로 데이터를 암호화한 뒤 서버에 올리고, 같은 코드로 복원 시 기존 가져오기(import) 파이프라인을 그대로 재사용한다. 보존 기간(무기한/1년/6개월)은 사용자가 직접 선택하며, 서버는 매 `PUT` 요청에 편승해 조건에 맞는 오래된 백업을 정리한다.

**Tech Stack:** FastAPI + sqlite3(백엔드), React + Web Crypto API(프론트), pytest + FastAPI TestClient(백엔드 테스트), vitest(프론트 테스트)

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-16-backend-and-backup-design.md` — 모든 태스크는 이 문서의 "아키텍처 결정"을 따른다.
- Docker/docker-compose 배포 구조는 변경하지 않는다(자체 호스팅 워크플로 유지).
- 복구코드 백업은 토글 없이 항상 켜져 있다 — 기능 온/오프 설정을 만들지 않는다.
- 클라우드 커넥터(WebDAV/iCloud/Drive), 확인코드 2단계 인증, rate limiting, Capacitor 네이티브 절대 URL 설정은 이번 스코프 밖이다.
- 복원 시 기존 로컬 데이터와의 충돌 정책: 기존 `importConfirm`/`api.importConfirm`과 동일하게 **항상 추가(append) 방식**이며 중복 제거를 하지 않는다. Settings 페이지의 기존 "가져오기 확정" 경고 문구(되돌릴 수 없음)를 그대로 재사용해 사용자에게 고지한다.

---

## 파일 구조 개요

**백엔드**
- `app/database.py` — 전면 교체: `recovery_backups` 단일 테이블 스키마
- `app/main.py` — 죽은 CRUD/가져오기·내보내기/이미지 라우트 제거, `lifespan` 단순화, 복구코드 라우트 3개 추가
- `Dockerfile` — `pip install` 목록에서 불필요한 의존성 제거
- `app/pytest.ini` — 신규, pytest가 `app/` 디렉터리를 import 경로에 포함하도록 설정
- `app/tests/conftest.py` — 신규, 테스트용 `DB_PATH` 환경변수 설정
- `app/tests/test_database.py`, `app/tests/test_main_startup.py`, `app/tests/test_recovery.py` — 신규 테스트

**프론트엔드**
- `frontend/src/recovery.js` — 신규, 암호화(코드↔조회키/암호화키 파생, AES-GCM)와 코드/보존기간/알림 상태를 관리하는 단일 모듈
- `frontend/src/recovery.test.js` — 신규 테스트
- `frontend/src/components/RecoveryCodeModal.jsx` — 신규, 최초 1회 고지 모달
- `frontend/src/App.jsx` — `RecoveryCodeModal` 마운트
- `frontend/src/main.jsx` — 앱 시작 시 `maybeAutoBackup()` 호출
- `frontend/src/pages/Settings.jsx` — 복구코드 관리(재확인/재발급/삭제) + "코드로 복구" UI 추가, 기존 문구 수정
- `frontend/src/index.css` — 복구코드 모달/박스 스타일 추가

**문서**
- `docs/privacy.md` — 복구코드 백업 관련 조항 추가/수정

---

### Task 1: `app/database.py` — recovery_backups 스키마로 교체 + pytest 인프라 구축

**Files:**
- Modify: `app/database.py`
- Create: `app/pytest.ini`
- Create: `app/tests/conftest.py`
- Create: `app/tests/test_database.py`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: `get_db()`(변경 없음, 기존 시그니처 유지), `init_db()`(변경 없음, 기존 시그니처 유지) — 단 `init_db()`가 생성하는 스키마가 `recovery_backups` 테이블 하나로 바뀜. 이후 모든 태스크가 이 스키마를 전제로 한다.

- [ ] **Step 1: 로컬 테스트 환경 준비**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pip install fastapi uvicorn pytest httpx
```

Expected: 설치 완료 로그, 에러 없음.

- [ ] **Step 2: pytest가 `app/` 을 import 경로로 잡도록 설정 파일 작성**

`app/pytest.ini`:
```ini
[pytest]
pythonpath = .
```

- [ ] **Step 3: 테스트용 DB_PATH를 설정하는 conftest 작성**

`app/tests/conftest.py`:
```python
import os
import tempfile

# main/database 모듈이 처음 import되기 전에 DB_PATH를 임시 파일로 돌려놓는다.
# database.py의 DB_PATH는 모듈 최상단에서 한 번만 계산되므로, conftest.py가
# 테스트 모듈보다 먼저 로드되는 pytest의 특성을 이용한다.
_tmp_dir = tempfile.mkdtemp(prefix="chapil-test-")
os.environ["DB_PATH"] = os.path.join(_tmp_dir, "test.db")
```

- [ ] **Step 4: 실패하는 테스트 작성**

`app/tests/test_database.py`:
```python
from database import get_db, init_db


def test_init_db_creates_recovery_backups_table():
    init_db()
    conn = get_db()
    cols = [row[1] for row in conn.execute("PRAGMA table_info(recovery_backups)").fetchall()]
    conn.close()
    assert cols == ["lookup_key", "ciphertext", "retention_months", "updated_at"]


def test_init_db_is_idempotent():
    init_db()
    init_db()  # 두 번 호출해도 에러가 나면 안 된다
    conn = get_db()
    conn.execute("SELECT COUNT(*) FROM recovery_backups")
    conn.close()
```

- [ ] **Step 5: 테스트 실행 → 실패 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/test_database.py -v
```

Expected: FAIL — `cols == []`이거나 `no such table: recovery_backups` (구 스키마에는 이 테이블이 없음)

- [ ] **Step 6: `app/database.py`를 신규 스키마로 교체**

`app/database.py` 전체를 다음으로 교체:
```python
import sqlite3
from pathlib import Path

import os
# Docker 환경은 /data/carlog.db, 로컬 환경은 app/ 옆에 data/ 폴더 생성
DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent.parent / "data" / "carlog.db"))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS recovery_backups (
            lookup_key       TEXT PRIMARY KEY,
            ciphertext       TEXT NOT NULL,
            retention_months INTEGER,
            updated_at       TEXT DEFAULT (datetime('now', 'localtime'))
        );
    """)
    conn.commit()
    conn.close()
```

- [ ] **Step 7: 테스트 재실행 → 통과 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/test_database.py -v
```

Expected: `2 passed`

- [ ] **Step 8: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add app/database.py app/pytest.ini app/tests/conftest.py app/tests/test_database.py
git commit -m "backend: recovery_backups 단일 스키마로 교체 + pytest 인프라 추가"
```

---

### Task 2: `app/main.py` — 죽은 코드 제거 및 lifespan 수정 (서버 기동 회귀 방지)

**Files:**
- Modify: `app/main.py`
- Create: `app/tests/test_main_startup.py`

**Interfaces:**
- Consumes: Task 1의 `init_db()`, `get_db()` (import 경로 `from database import get_db, init_db` 그대로 유지)
- Produces: `app`(FastAPI 인스턴스, 모듈 최상단 `app = FastAPI(...)`) — Task 3이 여기에 라우트를 추가한다. `/api/demo-seed` 라우트는 이 태스크에서 그대로 유지된다.

**주의:** 이 태스크가 가장 중요하다 — 기존 main.py의 `lifespan()`은 `backup_if_needed()`와 `seed_demo()`를 무조건 호출하는데, 이 함수들은 옛 `fuel`/`maintenance`/`other`/`settings` 테이블을 조회한다. Task 1에서 스키마를 이미 바꿨으므로, 이 함수 호출들을 제거하지 않고 그대로 두면 서버가 `no such table: settings` 에러로 기동 자체가 실패한다.

- [ ] **Step 1: 실패하는 테스트 작성 (현재는 옛 라우트들이 아직 남아있어 실패해야 정상)**

`app/tests/test_main_startup.py`:
```python
from fastapi.testclient import TestClient


def test_app_starts_without_error():
    """스키마 교체 후에도 서버가 예외 없이 기동하는지 확인 (핵심 회귀 테스트)"""
    from main import app
    with TestClient(app) as client:
        res = client.get("/api/demo-seed")
        assert res.status_code == 404  # DEMO_MODE 환경변수가 없으므로 404가 정상


def test_demo_seed_returns_data_when_demo_mode_on(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    from main import app
    with TestClient(app) as client:
        res = client.get("/api/demo-seed")
        assert res.status_code == 200
        assert "vehicle" in res.json()


def test_old_crud_routes_are_removed():
    from main import app
    with TestClient(app) as client:
        assert client.get("/api/fuel").status_code == 404
        assert client.get("/api/settings").status_code == 404
        assert client.get("/api/maintenance").status_code == 404
        assert client.get("/api/other").status_code == 404
        assert client.post("/api/import/preview", json={}).status_code == 404
        assert client.get("/api/export").status_code == 404
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/test_main_startup.py -v
```

Expected: `test_app_starts_without_error`가 서버 기동 단계에서 `sqlite3.OperationalError: no such table: settings`로 실패(아직 옛 lifespan 로직이 남아있으므로). 나머지 두 테스트는 옛 라우트가 아직 있으므로 함께 실패.

- [ ] **Step 3: `app/main.py`에서 죽은 코드 제거**

다음 항목들을 `app/main.py`에서 삭제한다:
- Import 중 `PIL`(`Image, ImageOps`), `openpyxl`, `redis`, `field_validator`, `Optional, List`(사용처가 사라지므로), `Enum`
- 전역 변수: `redis_client`, `BACKUP_DIR`, `BACKUP_MAX_COUNT`, `DATA_DIR`, `IMAGE_PATH`, `IMAGE_ORIGINAL_PATH`, `MAX_IMAGE_BYTES`
- 함수: `build_export_data()`, `backup_if_needed()`, `MAINTENANCE_ITEMS`, `OTHER_ITEMS`, `CarType`, `CarFuel`, `CAR_TYPE_OPTIONS`, `CAR_FUEL_OPTIONS`, `_CAR_TYPE_BY_LABEL`, `_CAR_FUEL_BY_LABEL`, `IMPORT_PROMPT`, `IMPORT_TEMPLATE`
- Pydantic 모델: `FuelBody`, `MaintenanceBody`, `OtherBody`, `SettingsBody`, `ImportRecordFuel`, `ImportRecordMaintenance`, `ImportRecordOther`, `ImportVehicle`, `ImportBody`
- 라우트: `get_dashboard`, `settings_options`, `get_settings`, `update_settings`, `upload_car_image_original`, `get_car_image_original`, `upload_car_image`, `get_car_image`, `delete_car_image`, `_cell_str`/`_to_int`/`_to_float`/`_parse_date`, `import_xlsx`, `import_preview`, `import_confirm`, `export_data`, `fuel_list`/`fuel_create`/`fuel_update`/`fuel_delete`, `maintenance_items`/`maintenance_list`/`maintenance_create`/`maintenance_update`/`maintenance_delete`, `other_items`/`other_list`/`other_create`/`other_update`/`other_delete`
- `seed_demo()` 함수 자체(서버 DB에 데모 데이터를 미리 채우던 용도 — 이제 프론트가 `/api/demo-seed` JSON을 받아 클라이언트 DB에 직접 채우므로 불필요)
- `lifespan()` 안의 `seed_demo()`, `backup_if_needed()` 호출

**남기는 것**: `app = FastAPI(...)`, `STATIC_DIR`/`DIST_DIR` 관련 정적 서빙, `CoopCoepMiddleware`, `CORSMiddleware`, `/api/demo-seed`(`get_demo_seed`), 맨 아래 `serve_spa` catch-all 라우트.

`CoopCoepMiddleware`의 주석도 함께 정정한다(실제로는 `frontend/src/db.js`가 OPFS를 쓰지 않고 kvvfs만 사용하므로, "OPFS에 필수"라는 기존 주석은 부정확하다 — 헤더 자체는 안전하게 유지하되 주석만 정확하게 고친다):

```python
# COOP/COEP 미들웨어: 과거 sqlite-wasm OPFS 지원을 염두에 두고 추가되었으나,
# 현재 frontend/src/db.js는 OPFS를 전혀 사용하지 않고 kvvfs(localStorage 기반)만
# 사용한다. 이 헤더가 지금도 실제로 필요한지는 확인되지 않았다 — 제거해도 kvvfs
# 저장이 정상 동작하는지 검증 전까지는 안전하게 유지한다.
class CoopCoepMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response
```

정리 후 `app/main.py`는 다음 구조가 된다(정확한 순서):
```python
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
import json
import os
from database import get_db, init_db

BASE_DIR = Path(__file__).parent

# STATIC_DIR: 로컬에서는 ../static, Docker에서는 ENV STATIC_DIR=/app/static 으로 주입된다.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(BASE_DIR.parent / "static")))

# DIST_DIR: React 빌드 결과물 경로. Docker 빌드 시에만 존재한다.
DIST_DIR = BASE_DIR / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="차계부", lifespan=lifespan)

# 정적 파일 서빙 — Docker 빌드 시에만 static/ 폴더가 존재한다.
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# COOP/COEP 미들웨어: 과거 sqlite-wasm OPFS 지원을 염두에 두고 추가되었으나,
# 현재 frontend/src/db.js는 OPFS를 전혀 사용하지 않고 kvvfs(localStorage 기반)만
# 사용한다. 이 헤더가 지금도 실제로 필요한지는 확인되지 않았다 — 제거해도 kvvfs
# 저장이 정상 동작하는지 검증 전까지는 안전하게 유지한다.
class CoopCoepMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response

app.add_middleware(CoopCoepMiddleware)

# CORS 미들웨어: React SPA가 다른 포트(예: localhost:5173)에서 이 API를 호출할 수 있도록 허용.
# 배포 시에는 allow_origins를 실제 도메인으로 제한할 것.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/demo-seed")
def get_demo_seed():
    if os.environ.get("DEMO_MODE", "").lower() != "true":
        raise HTTPException(status_code=404)
    seed_path = BASE_DIR / "seed_demo.json"
    if not seed_path.exists():
        raise HTTPException(status_code=404)
    with open(seed_path, encoding="utf-8") as f:
        return json.load(f)


# ── React SPA 서빙 ────────────────────────────────────────────────────
# Docker 빌드 시 dist/ 가 존재할 때만 활성화된다.
# 로컬 개발 환경에서는 Vite dev server(5173)가 프론트를 담당하므로 이 블록은 실행되지 않는다.
#
# /{full_path:path} : 위에서 정의한 /api/* 라우트에 매칭되지 않은
#                     모든 경로를 여기서 받아 처리한다.
if DIST_DIR.exists():
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        target = DIST_DIR / full_path
        if target.exists() and target.is_file():
            return FileResponse(
                target,
                headers={"Cache-Control": "public, max-age=31536000, immutable"},
            )
        return FileResponse(
            DIST_DIR / "index.html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
```

(Task 3에서 `get_demo_seed`와 `serve_spa` 사이에 복구코드 라우트 3개를 추가한다 — 반드시 `serve_spa` catch-all **이전**에 추가해야 한다.)

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/test_main_startup.py -v
```

Expected: `3 passed` — 특히 `test_app_starts_without_error`가 통과하는 것이 이번 태스크의 핵심 목표다.

- [ ] **Step 5: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add app/main.py app/tests/test_main_startup.py
git commit -m "backend: 프론트에서 더 이상 호출하지 않는 CRUD/가져오기·내보내기/이미지 라우트 제거"
```

---

### Task 3: `app/main.py` — 복구코드 라우트(PUT/GET/DELETE) + 보존기간 자동 정리

**Files:**
- Modify: `app/main.py`
- Create: `app/tests/test_recovery.py`

**Interfaces:**
- Consumes: Task 2가 만든 `app`(FastAPI 인스턴스), Task 1의 `recovery_backups` 스키마
- Produces: `PUT /api/recovery/{lookup_key}`(body: `{ciphertext: str, retention_months: int|null}` → `{ok: true}`), `GET /api/recovery/{lookup_key}`(→ `{ciphertext, updated_at}` 또는 404), `DELETE /api/recovery/{lookup_key}`(→ 204). 프론트엔드 Task 5의 `recovery.js`가 이 세 엔드포인트를 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/tests/test_recovery.py`:
```python
from fastapi.testclient import TestClient
from main import app
from database import get_db


def test_put_then_get_roundtrip():
    with TestClient(app) as client:
        res = client.put(
            "/api/recovery/testkey001",
            json={"ciphertext": "abc123", "retention_months": None},
        )
        assert res.status_code == 200
        res = client.get("/api/recovery/testkey001")
        assert res.status_code == 200
        assert res.json()["ciphertext"] == "abc123"


def test_get_missing_key_returns_404():
    with TestClient(app) as client:
        res = client.get("/api/recovery/does-not-exist")
        assert res.status_code == 404


def test_delete_then_get_returns_404():
    with TestClient(app) as client:
        client.put(
            "/api/recovery/testkey002",
            json={"ciphertext": "xyz", "retention_months": None},
        )
        res = client.delete("/api/recovery/testkey002")
        assert res.status_code == 204
        res = client.get("/api/recovery/testkey002")
        assert res.status_code == 404


def test_put_upserts_existing_key():
    with TestClient(app) as client:
        client.put(
            "/api/recovery/testkey003",
            json={"ciphertext": "first", "retention_months": None},
        )
        client.put(
            "/api/recovery/testkey003",
            json={"ciphertext": "second", "retention_months": None},
        )
        res = client.get("/api/recovery/testkey003")
        assert res.json()["ciphertext"] == "second"


def test_retention_sweep_removes_stale_row_but_keeps_unlimited():
    with TestClient(app) as client:
        client.put(
            "/api/recovery/stale-key",
            json={"ciphertext": "old", "retention_months": 6},
        )
        client.put(
            "/api/recovery/forever-key",
            json={"ciphertext": "keep", "retention_months": None},
        )

        # stale-key를 7개월 전에 갱신된 것처럼 시간을 되돌린다
        conn = get_db()
        conn.execute(
            "UPDATE recovery_backups SET updated_at = datetime('now', '-7 months')"
            " WHERE lookup_key='stale-key'"
        )
        conn.commit()
        conn.close()

        # 아무 PUT이나 한 번 더 호출하면 스윕이 함께 트리거된다
        client.put(
            "/api/recovery/trigger-key",
            json={"ciphertext": "x", "retention_months": None},
        )

        assert client.get("/api/recovery/stale-key").status_code == 404
        assert client.get("/api/recovery/forever-key").status_code == 200
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/test_recovery.py -v
```

Expected: FAIL — `404 Not Found` (라우트가 아직 없음)

- [ ] **Step 3: `app/main.py`에 Pydantic 모델과 라우트 3개 추가**

`app/main.py`의 import 줄에 `Optional`을 추가하고 `BaseModel`을 import한다:
```python
from typing import Optional
from pydantic import BaseModel
```

`get_demo_seed` 함수 바로 아래, `serve_spa` catch-all **이전**에 다음을 추가:
```python
class RecoveryBody(BaseModel):
    ciphertext: str
    retention_months: Optional[int] = None


# ── 복구코드 백업 ─────────────────────────────────────────────────────
# lookup_key는 클라이언트가 코드로부터 SHA-256으로 파생시킨 값이다.
# 서버는 이 값과 암호문만 가지고 있으며, 원본 코드나 복호화 키를 알 수 없다.
@app.put("/api/recovery/{lookup_key}")
def recovery_put(lookup_key: str, body: RecoveryBody):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO recovery_backups (lookup_key, ciphertext, retention_months, updated_at)"
        " VALUES (?, ?, ?, datetime('now', 'localtime'))",
        (lookup_key, body.ciphertext, body.retention_months),
    )
    # 보존 기간이 지난 백업을 이 기회에 함께 정리한다 (별도 스케줄러 없음)
    conn.execute(
        "DELETE FROM recovery_backups"
        " WHERE retention_months IS NOT NULL"
        " AND updated_at < datetime('now', '-' || retention_months || ' months')"
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/api/recovery/{lookup_key}")
def recovery_get(lookup_key: str):
    conn = get_db()
    row = conn.execute(
        "SELECT ciphertext, updated_at FROM recovery_backups WHERE lookup_key=?",
        (lookup_key,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="해당 코드로 저장된 백업이 없습니다.")
    return dict(row)


@app.delete("/api/recovery/{lookup_key}", status_code=204)
def recovery_delete(lookup_key: str):
    conn = get_db()
    conn.execute("DELETE FROM recovery_backups WHERE lookup_key=?", (lookup_key,))
    conn.commit()
    conn.close()
```

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/pytest tests/ -v
```

Expected: 전체 테스트(Task 1~3) 통과.

- [ ] **Step 5: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add app/main.py app/tests/test_recovery.py
git commit -m "backend: 복구코드 PUT/GET/DELETE 라우트와 보존기간 자동 정리 추가"
```

---

### Task 4: `Dockerfile` — 불필요해진 pip 의존성 제거

**Files:**
- Modify: `Dockerfile`

**Interfaces:**
- Consumes: Task 2~3에서 확정된 최종 import 목록(`fastapi`, `uvicorn`만 사용, `redis`/`openpyxl`/`pillow`/`python-multipart` 미사용)
- Produces: 없음 (배포 산출물 크기 축소만 영향)

- [ ] **Step 1: `Dockerfile`에서 pip install 목록 수정**

`Dockerfile`의 다음 줄을 찾는다:
```dockerfile
RUN pip install --no-cache-dir fastapi uvicorn redis openpyxl pillow python-multipart
```

다음으로 교체한다:
```dockerfile
RUN pip install --no-cache-dir fastapi uvicorn
```

- [ ] **Step 2: Docker 이미지가 정상적으로 빌드되고 기동하는지 확인**

```bash
cd /home/iranto/Gitea/chapil
docker build -t chapil-test .
docker run --rm -e DEMO_MODE=false -p 8001:8000 -d --name chapil-test-run chapil-test
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/demo-seed
docker stop chapil-test-run
```

Expected: 빌드 성공, curl 결과 `404`(DEMO_MODE가 false이므로 정상), 컨테이너 로그에 `no such table` 등의 에러 없이 정상 기동.

- [ ] **Step 3: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add Dockerfile
git commit -m "backend: 더 이상 쓰지 않는 redis/openpyxl/pillow/python-multipart 의존성 제거"
```

---

### Task 5: `frontend/src/recovery.js` — 암호화 및 코드/보존기간 관리 모듈

**Files:**
- Create: `frontend/src/recovery.js`
- Create: `frontend/src/recovery.test.js`

**Interfaces:**
- Consumes: `api.exportData()`(`frontend/src/api.js`에 기존 존재, `{vehicle, fuel, maintenance, other}` 반환)
- Produces: `generateCode()`, `encryptPayload(code, dataObj)`, `decryptPayload(code, base64)`, `hasCode()`, `getOrCreateCode()`, `regenerateCode()`, `hasAcknowledgedNotice()`, `acknowledgeNotice()`, `getRetentionMonths()`, `setRetentionMonths(months|null)`, `pushBackup()`, `maybeAutoBackup()`, `restoreFromCode(code)`(디코딩된 `{vehicle, fuel, maintenance, other}` 반환), `deleteBackup(code)` — Task 6, 7, 8이 이 함수들을 그대로 import해서 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/recovery.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from './api.js'
import {
  generateCode, encryptPayload, decryptPayload,
  getOrCreateCode, regenerateCode,
  getRetentionMonths, setRetentionMonths,
  hasAcknowledgedNotice, acknowledgeNotice,
  pushBackup, maybeAutoBackup, restoreFromCode, deleteBackup,
} from './recovery.js'

beforeEach(() => {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { for (const k in store) delete store[k] },
  }
})

describe('generateCode', () => {
  it('64자 hex 문자열을 생성한다', () => {
    const code = generateCode()
    expect(code).toMatch(/^[0-9a-f]{64}$/)
  })

  it('호출할 때마다 다른 값을 생성한다', () => {
    expect(generateCode()).not.toBe(generateCode())
  })
})

describe('encryptPayload / decryptPayload', () => {
  it('암호화한 데이터를 같은 코드로 복호화하면 원본과 일치한다', async () => {
    const code = generateCode()
    const original = { vehicle: { car_plate: '123가4567' }, fuel: [{ date: '2026-01-01', amount: 50000 }] }
    const ciphertext = await encryptPayload(code, original)
    const decrypted = await decryptPayload(code, ciphertext)
    expect(decrypted).toEqual(original)
  })

  it('다른 코드로 복호화를 시도하면 실패한다', async () => {
    const code = generateCode()
    const wrongCode = generateCode()
    const ciphertext = await encryptPayload(code, { a: 1 })
    await expect(decryptPayload(wrongCode, ciphertext)).rejects.toThrow()
  })

  it('매 호출마다 IV가 달라 같은 데이터라도 암호문이 달라진다', async () => {
    const code = generateCode()
    const a = await encryptPayload(code, { a: 1 })
    const b = await encryptPayload(code, { a: 1 })
    expect(a).not.toBe(b)
  })
})

describe('getOrCreateCode / regenerateCode', () => {
  it('처음 호출하면 새 코드를 만들어 localStorage에 저장한다', () => {
    const code = getOrCreateCode()
    expect(localStorage.getItem('chapil:recovery:code')).toBe(code)
  })

  it('이미 코드가 있으면 같은 값을 반환한다', () => {
    const first = getOrCreateCode()
    const second = getOrCreateCode()
    expect(second).toBe(first)
  })

  it('regenerateCode는 기존과 다른 새 코드로 교체한다', () => {
    const original = getOrCreateCode()
    const fresh = regenerateCode()
    expect(fresh).not.toBe(original)
    expect(getOrCreateCode()).toBe(fresh)
  })
})

describe('보존 기간', () => {
  it('기본값은 null(무기한)이다', () => {
    expect(getRetentionMonths()).toBeNull()
  })

  it('설정한 값을 다시 읽을 수 있다', () => {
    setRetentionMonths(6)
    expect(getRetentionMonths()).toBe(6)
  })

  it('null로 설정하면 무기한으로 되돌아간다', () => {
    setRetentionMonths(6)
    setRetentionMonths(null)
    expect(getRetentionMonths()).toBeNull()
  })
})

describe('고지 확인 상태', () => {
  it('처음에는 확인되지 않은 상태다', () => {
    expect(hasAcknowledgedNotice()).toBe(false)
  })

  it('acknowledgeNotice 호출 후 true가 된다', () => {
    acknowledgeNotice()
    expect(hasAcknowledgedNotice()).toBe(true)
  })
})

describe('pushBackup', () => {
  it('exportData 결과를 암호화해서 PUT으로 전송하고 lastPush를 기록한다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock

    await pushBackup()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toMatch(/^\/api\/recovery\/[0-9a-f]{64}$/)
    expect(opts.method).toBe('PUT')
    expect(localStorage.getItem('chapil:recovery:lastPush')).not.toBeNull()
  })

  it('서버가 실패 응답을 주면 에러를 던진다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(pushBackup()).rejects.toThrow()
  })
})

describe('maybeAutoBackup', () => {
  it('마지막 푸시로부터 24시간이 안 지났으면 아무것도 하지 않는다', async () => {
    localStorage.setItem('chapil:recovery:lastPush', String(Date.now()))
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    await maybeAutoBackup()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('푸시 기록이 없으면(최초 실행) 바로 백업을 시도한다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock

    await maybeAutoBackup()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('서버가 닿지 않아도(오프라인) 에러를 던지지 않고 조용히 넘어간다', async () => {
    vi.spyOn(api, 'exportData').mockResolvedValue({ vehicle: {}, fuel: [], maintenance: [], other: [] })
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(maybeAutoBackup()).resolves.toBeUndefined()
  })
})

describe('restoreFromCode', () => {
  it('서버에서 받은 암호문을 복호화해서 원본 데이터를 반환한다', async () => {
    const code = generateCode()
    const original = { vehicle: { car_plate: '123가4567' }, fuel: [], maintenance: [], other: [] }
    const ciphertext = await encryptPayload(code, original)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ciphertext, updated_at: '2026-07-16' }),
    })

    const result = await restoreFromCode(code)

    expect(result).toEqual(original)
  })

  it('서버에 해당 코드로 저장된 백업이 없으면(404) 에러를 던진다', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(restoreFromCode(generateCode())).rejects.toThrow('해당 코드로 저장된 백업이 없습니다.')
  })
})

describe('deleteBackup', () => {
  it('DELETE 요청을 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    globalThis.fetch = fetchMock

    await deleteBackup(generateCode())

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('이미 삭제된 코드(404)에 대해서도 에러를 던지지 않는다', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(deleteBackup(generateCode())).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm test -- recovery.test.js
```

Expected: FAIL — `Failed to resolve import "./recovery.js"`

- [ ] **Step 3: `frontend/src/recovery.js` 작성**

```js
import { api } from './api.js'

const CODE_KEY       = 'chapil:recovery:code'
const RETENTION_KEY  = 'chapil:recovery:retentionMonths'
const LAST_PUSH_KEY  = 'chapil:recovery:lastPush'
const NOTICE_ACK_KEY = 'chapil:recovery:noticeAcknowledged'
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const HKDF_INFO = new TextEncoder().encode('chapil-backup-v1')

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export function generateCode() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

async function deriveLookupKey(code) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return bytesToHex(new Uint8Array(digest))
}

async function deriveEncryptionKey(code) {
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(code), 'HKDF', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptPayload(code, dataObj) {
  const key = await deriveEncryptionKey(code)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(dataObj))
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const combined = new Uint8Array(iv.length + ciphertextBuf.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertextBuf), iv.length)
  return bytesToBase64(combined)
}

export async function decryptPayload(code, base64) {
  const key = await deriveEncryptionKey(code)
  const combined = base64ToBytes(base64)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plainBuf))
}

export function hasCode() {
  return localStorage.getItem(CODE_KEY) !== null
}

export function getOrCreateCode() {
  let code = localStorage.getItem(CODE_KEY)
  if (!code) {
    code = generateCode()
    localStorage.setItem(CODE_KEY, code)
  }
  return code
}

export function regenerateCode() {
  const code = generateCode()
  localStorage.setItem(CODE_KEY, code)
  localStorage.removeItem(LAST_PUSH_KEY)
  return code
}

export function hasAcknowledgedNotice() {
  return localStorage.getItem(NOTICE_ACK_KEY) === '1'
}

export function acknowledgeNotice() {
  localStorage.setItem(NOTICE_ACK_KEY, '1')
}

export function getRetentionMonths() {
  const v = localStorage.getItem(RETENTION_KEY)
  return v ? Number(v) : null
}

export function setRetentionMonths(months) {
  if (months == null) localStorage.removeItem(RETENTION_KEY)
  else localStorage.setItem(RETENTION_KEY, String(months))
}

export async function pushBackup() {
  const code = getOrCreateCode()
  const lookupKey = await deriveLookupKey(code)
  const data = await api.exportData()
  const ciphertext = await encryptPayload(code, data)
  const res = await fetch(`/api/recovery/${lookupKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciphertext, retention_months: getRetentionMonths() }),
  })
  if (!res.ok) throw new Error(`백업 전송 실패: ${res.status}`)
  localStorage.setItem(LAST_PUSH_KEY, String(Date.now()))
}

export async function maybeAutoBackup() {
  const last = Number(localStorage.getItem(LAST_PUSH_KEY) || 0)
  if (Date.now() - last < AUTO_BACKUP_INTERVAL_MS) return
  try {
    await pushBackup()
  } catch {
    // 서버가 닿지 않는 등 — 다음 기회에 재시도(오프라인 시 조용히 무시)
  }
}

export async function restoreFromCode(code) {
  const lookupKey = await deriveLookupKey(code)
  const res = await fetch(`/api/recovery/${lookupKey}`)
  if (res.status === 404) throw new Error('해당 코드로 저장된 백업이 없습니다.')
  if (!res.ok) throw new Error(`복원 실패: ${res.status}`)
  const { ciphertext } = await res.json()
  return decryptPayload(code, ciphertext)
}

export async function deleteBackup(code) {
  const lookupKey = await deriveLookupKey(code)
  const res = await fetch(`/api/recovery/${lookupKey}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`삭제 실패: ${res.status}`)
}
```

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm test -- recovery.test.js
```

Expected: 전체 테스트 통과 (`generateCode`, `encryptPayload/decryptPayload`, `getOrCreateCode/regenerateCode`, 보존 기간, 고지 확인 상태, `pushBackup`, `maybeAutoBackup`, `restoreFromCode`, `deleteBackup` — 총 22개 테스트)

- [ ] **Step 5: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add frontend/src/recovery.js frontend/src/recovery.test.js
git commit -m "frontend: 복구코드 암호화/코드 관리 모듈 추가"
```

---

### Task 6: 최초 1회 고지 모달 (`RecoveryCodeModal`)

**Files:**
- Create: `frontend/src/components/RecoveryCodeModal.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: Task 5의 `getOrCreateCode()`, `acknowledgeNotice()`, `hasAcknowledgedNotice()`, `setRetentionMonths()`
- Produces: `<RecoveryCodeModal onClose={fn} />` 컴포넌트 — `App.jsx`에서만 사용.

- [ ] **Step 1: `RecoveryCodeModal.jsx` 작성**

`frontend/src/components/RecoveryCodeModal.jsx`:
```jsx
import { useState } from 'react'
import { getOrCreateCode, acknowledgeNotice, setRetentionMonths } from '../recovery'

export default function RecoveryCodeModal({ onClose }) {
  const [code] = useState(() => getOrCreateCode())
  const [retention, setRetention] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleConfirm = () => {
    setRetentionMonths(retention ? Number(retention) : null)
    acknowledgeNotice()
    onClose()
  }

  return (
    <div className="recovery-modal-overlay">
      <div className="recovery-modal">
        <h2>복구코드가 발급되었습니다</h2>
        <p>
          서버에는 이 코드로 암호화된 데이터만 저장되며, 관리자를 포함해 코드 없이는
          아무도 열람할 수 없습니다.
        </p>
        <p>
          <b>이 코드는 지금 기기 안에만 저장되어 있습니다.</b> 브라우저 저장소가
          초기화되거나 앱을 지우면 코드 자체도 함께 사라지므로, 지금 바로 복사해서
          별도로(메모 앱, 다른 기기 등) 보관해야만 나중에 복원이 가능합니다.
        </p>
        <div className="recovery-code-box">
          <code>{code}</code>
          <button type="button" className="btn" onClick={handleCopy}>
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <div className="form-group">
          <label>보존 기간</label>
          <select value={retention} onChange={(e) => setRetention(e.target.value)}>
            <option value="">무기한 보관 (기본값)</option>
            <option value="12">1년 미접속 시 자동 삭제</option>
            <option value="6">6개월 미접속 시 자동 삭제</option>
          </select>
        </div>
        <button type="button" className="btn btn-import-confirm" onClick={handleConfirm}>
          확인
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `App.jsx`에 모달 마운트**

`frontend/src/App.jsx` 상단 import에 추가:
```jsx
import { useState } from 'react'
import { hasAcknowledgedNotice } from './recovery'
import RecoveryCodeModal from './components/RecoveryCodeModal'
```

`AppContent` 함수 내부, `const location = useLocation()` 다음 줄에 추가:
```jsx
  const [showRecoveryModal, setShowRecoveryModal] = useState(() => !hasAcknowledgedNotice())
```

`return (` 블록의 첫 줄(`<>` 바로 다음)에 추가:
```jsx
      {showRecoveryModal && <RecoveryCodeModal onClose={() => setShowRecoveryModal(false)} />}
```

- [ ] **Step 3: `index.css`에 모달 스타일 추가**

`frontend/src/index.css`의 `.car-modal-btns button:first-child { color: var(--color-danger); }` 줄 바로 다음에 추가:
```css

/* 복구코드 고지 모달 */
.recovery-modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.recovery-modal {
  background: var(--surface-elevated);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  backdrop-filter: var(--blur);
  padding: 20px;
  max-width: 420px;
  display: flex; flex-direction: column; gap: 12px;
}
.recovery-code-box {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; margin: 4px 0;
  background: var(--surface-variant); border-radius: var(--radius-sm);
}
.recovery-code-box code {
  flex: 1; font-size: 12px; word-break: break-all; user-select: all;
}
```

- [ ] **Step 4: 개발 서버로 수동 확인**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm run dev
```

브라우저에서 `http://localhost:5173`을 열고(브라우저 개발자 도구 콘솔에서 `localStorage.clear()` 실행 후 새로고침), 다음을 확인:
- 모달이 뜨고 64자리 코드가 표시되는지
- "복사" 버튼이 동작하는지(클립보드에 복사됨 문구로 바뀌는지)
- 보존 기간 선택 후 "확인"을 누르면 모달이 닫히고, 새로고침해도 다시 뜨지 않는지
- 개발자 도구 Application 탭에서 `localStorage`에 `chapil:recovery:code`, `chapil:recovery:noticeAcknowledged` 키가 저장되어 있는지

- [ ] **Step 5: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add frontend/src/components/RecoveryCodeModal.jsx frontend/src/App.jsx frontend/src/index.css
git commit -m "frontend: 복구코드 최초 1회 고지 모달 추가"
```

---

### Task 7: `main.jsx` — 앱 시작 시 자동 백업 트리거

**Files:**
- Modify: `frontend/src/main.jsx`

**Interfaces:**
- Consumes: Task 5의 `maybeAutoBackup()`
- Produces: 없음 (부수효과만)

- [ ] **Step 1: `main.jsx`에 import 및 호출 추가**

`frontend/src/main.jsx` 상단 import에 추가:
```jsx
import { maybeAutoBackup } from './recovery.js'
```

`initDB().then(...)` 체인의 렌더링 콜백 안, `createRoot(...).render(...)` 다음 줄에 추가(렌더링을 막지 않도록 `await` 하지 않는다):
```jsx
initDB().then(() => maybeSeedDemo()).then(() => initImages()).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  maybeAutoBackup()
}).catch(err => {
  console.error('DB 초기화 실패:', err)
  document.getElementById('root').innerHTML =
    `<pre style="padding:20px;color:red;white-space:pre-wrap">DB 초기화 실패:\n${err?.message ?? err}</pre>`
})
```

- [ ] **Step 2: 개발 서버로 수동 확인**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm run dev
```

백엔드도 로컬에서 함께 띄운다(다른 터미널):
```bash
cd /home/iranto/Gitea/chapil/app
.venv/bin/uvicorn main:app --reload --port 8000
```

브라우저에서 `http://localhost:5173`을 열고 네트워크 탭에서 `PUT /api/recovery/...` 요청이 한 번 나가는지 확인한다(Vite dev server가 `/api`를 8000번 포트로 프록시하지 않는 구성이면, 이 확인은 Docker로 프론트+백엔드를 함께 띄운 뒤 진행해도 된다 — 로컬 dev 프록시 설정이 없다면 이 단계는 Task 8 완료 후 Docker 빌드로 통합 확인).

- [ ] **Step 3: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add frontend/src/main.jsx
git commit -m "frontend: 앱 시작 시 24시간 스로틀된 자동 백업 푸시 연결"
```

---

### Task 8: `Settings.jsx` — 복구코드 관리 UI + "코드로 복구" + 문구 수정

**Files:**
- Modify: `frontend/src/pages/Settings.jsx`

**Interfaces:**
- Consumes: Task 5의 `getOrCreateCode()`, `regenerateCode()`, `deleteBackup(code)`, `restoreFromCode(code)`, `getRetentionMonths()`, `setRetentionMonths()`. 기존 `api.importPreview(data)`(이미 Settings.jsx에 import되어 있음).
- Produces: 없음 (페이지 UI)

- [ ] **Step 1: import 및 state 추가**

`frontend/src/pages/Settings.jsx` 상단 import에 추가:
```jsx
import {
  getOrCreateCode, regenerateCode, deleteBackup, restoreFromCode,
  getRetentionMonths, setRetentionMonths,
} from '../recovery'
```

`export default function Settings() {` 내부, 기존 state 선언들 다음에 추가:
```jsx
  const [recoveryCode, setRecoveryCode] = useState(() => getOrCreateCode())
  const [retention, setRetention]       = useState(() => getRetentionMonths() ?? '')
  const [restoreCodeInput, setRestoreCodeInput] = useState('')
  const [restoring, setRestoring]       = useState(false)
  const [recoveryMsg, setRecoveryMsg]   = useState('')
```

- [ ] **Step 2: 핸들러 추가**

`handleConfirm` 함수 바로 다음에 추가:
```jsx
  const handleRetentionChange = (e) => {
    const v = e.target.value
    setRetention(v)
    setRetentionMonths(v ? Number(v) : null)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setRecoveryMsg('복사되었습니다.')
    } catch {
      setRecoveryMsg('복사에 실패했습니다.')
    }
  }

  const handleRegenerateCode = async () => {
    const ok = window.confirm(
      '현재 코드로 저장된 서버 백업을 삭제하고 새 코드를 발급합니다.\n' +
      '기존 코드는 더 이상 복구에 사용할 수 없습니다. 계속할까요?'
    )
    if (!ok) return
    try {
      await deleteBackup(recoveryCode)
    } catch (err) {
      setRecoveryMsg(`삭제 실패: ${err.message}`)
      return
    }
    const fresh = regenerateCode()
    setRecoveryCode(fresh)
    setRecoveryMsg('새 코드가 발급되었습니다. 아래 코드를 다시 저장해 주세요.')
  }

  const handleRestore = async () => {
    if (!restoreCodeInput.trim()) return
    setRestoring(true)
    setImportError('')
    try {
      const data = await restoreFromCode(restoreCodeInput.trim())
      setPreviewData(api.importPreview(data))
    } catch (err) {
      setImportError(`복구 실패: ${err.message}`)
    } finally {
      setRestoring(false)
    }
  }
```

- [ ] **Step 3: 기존 "어디에도 전송되지 않습니다" 문구 수정**

`frontend/src/pages/Settings.jsx`에서 다음 부분을 찾는다(`"데이터 관리"` 섹션 안):
```jsx
        <div className="section-advice">
          <p>차필에서 작성하신 데이터는 사용자의 기기 내부에 저장되며, 어디에도 전송되지 않습니다. 사용자께서 주기적으로 '데이터 내보내기'를 통하여 개인 드라이브, 클라우드 등 안전한 장소에 백업(보관)하실 것을 권장 드립니다.</p>
```

다음으로 교체:
```jsx
        <div className="section-advice">
          <p>차필에서 작성하신 데이터는 기본적으로 사용자의 기기 내부에 저장됩니다. 아래 '복구코드 백업' 기능을 통해 24시간마다 암호화된 데이터가 자동으로 서버에 전송되며, 코드 없이는 개발자를 포함해 아무도 열람할 수 없습니다.</p>
```

- [ ] **Step 4: "복구코드 백업" 섹션 JSX 추가**

기존 `{importing && <p className="import-loading">가져오는 중…</p>}` 다음, `<div className="section-header">기타</div>` 이전에 추가:
```jsx
        <div className="section-header">복구코드 백업</div>
        <div className="section-advice">
          <p>기기 손상 등에 대비해 24시간마다 암호화된 데이터가 자동으로 서버에 백업됩니다. 아래 코드가 있어야 복원할 수 있으니 안전한 곳에 보관하세요.</p>
        </div>
        <div className="recovery-code-box">
          <code>{recoveryCode}</code>
          <button type="button" className="btn" onClick={handleCopyCode}>복사</button>
        </div>
        <div className="form-group">
          <label>보존 기간</label>
          <select value={retention} onChange={handleRetentionChange}>
            <option value="">무기한 보관</option>
            <option value="12">1년 미접속 시 자동 삭제</option>
            <option value="6">6개월 미접속 시 자동 삭제</option>
          </select>
        </div>
        <div className="set-migrate">
          <button type="button" className="btn" onClick={handleRegenerateCode}>코드 재발급 및 기존 백업 삭제</button>
        </div>
        {recoveryMsg && <p className="import-done-inline">{recoveryMsg}</p>}

        <div className="form-group">
          <label>다른 코드로 복구</label>
          <input
            type="text"
            value={restoreCodeInput}
            onChange={(e) => setRestoreCodeInput(e.target.value)}
            placeholder="64자리 복구코드 입력"
          />
        </div>
        <div className="set-migrate">
          <button type="button" className="btn" onClick={handleRestore} disabled={restoring}>
            {restoring ? '복원하는 중…' : '코드로 복구'}
          </button>
        </div>
```

- [ ] **Step 5: 프론트 전체 테스트 재실행 (회귀 확인)**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm test
```

Expected: 기존 테스트(`pagination.test.js`, `pagination.integration.test.js`)와 Task 5의 `recovery.test.js` 모두 통과.

- [ ] **Step 6: 개발 서버로 수동 확인**

```bash
cd /home/iranto/Gitea/chapil/frontend
npm run dev
```

설정 페이지(`/settings`)로 이동해 다음을 확인:
- "복구코드 백업" 섹션에 코드와 "복사" 버튼이 보이는지
- 보존 기간 select를 바꾸면 새로고침 후에도 선택값이 유지되는지(`localStorage` 확인)
- "코드로 복구" 입력창에 방금 확인한 코드를 넣고 버튼을 누르면(단, 아직 서버에 백업이 없다면 "해당 코드로 저장된 백업이 없습니다" 에러가 뜨는 것이 정상 — Task 7에서 자동 푸시가 이미 한 번 일어났다면 미리보기가 뜨는지) 동작을 확인

- [ ] **Step 7: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add frontend/src/pages/Settings.jsx
git commit -m "frontend: 설정 페이지에 복구코드 관리 및 코드로 복구 UI 추가"
```

---

### Task 9: `docs/privacy.md` 갱신

**Files:**
- Modify: `docs/privacy.md`

**Interfaces:**
- Consumes: 없음 (문서만 수정)
- Produces: 없음

- [ ] **Step 1: `docs/privacy.md` 전체를 다음으로 교체**

```markdown
# 차필 개인정보 처리방침

최종 수정일: 2026년 7월 16일

## 1. 수집하는 정보

차필은 사용자의 차량 기록 데이터(주유, 정비, 기타 지출 등)를 **기본적으로 사용자의 기기 내부에만 저장**합니다.

**복구코드 백업**은 별도 설정이나 동의 절차 없이 앱을 처음 실행할 때 자동으로 활성화되며, 끌 수 있는 기능이 아닙니다. 24시간마다 한 번씩, 기기 내 데이터를 암호화한 뒤 개발자가 운영하는 서버로 전송해 보관합니다. 이때 사용되는 암호화 키는 앱이 발급한 복구코드로부터만 계산되며 서버에는 저장되지 않으므로, **개발자를 포함해 코드를 모르는 누구도 저장된 내용을 열람할 수 없습니다.**

피드백 전송 기능을 사용하는 경우에 한해 다음 정보가 수집됩니다.

| 항목 | 내용 |
|---|---|
| 사용자가 직접 입력한 피드백 내용 | 전송 시에만 수집 |
| 앱 버전 | 예: 26.6.1 |
| Android 버전 | 예: 14 |
| 기기 모델명 | 예: Galaxy S24 |
| 오류 발생 코드 위치 | 줄 번호만 포함, 입력하신 데이터는 포함되지 않음 |

## 2. 수집 목적

- 복구코드 백업: 기기 손상, 로컬 데이터 손실 등으로 인한 데이터 유실을 복구하기 위한 목적으로만 사용됩니다. 다만 복구코드를 기기 밖에 미리 저장해두지 않았다면, 기기 자체를 분실하거나 앱 저장소가 초기화되는 경우에는 복구코드도 함께 사라지므로 복구가 불가능합니다.
- 피드백: 앱의 오류 수정 및 개선에만 사용되며, 제3자에게 제공되거나 마케팅 목적으로 사용되지 않습니다.

## 3. 보관 및 관리

- 복구코드 백업의 보존 기간은 사용자가 최초 설정 시 직접 선택합니다(무기한 / 1년 미접속 시 자동 삭제 / 6개월 미접속 시 자동 삭제). 법령상 강제되는 기간이 아니라 사용자가 스스로 정하는 것이며, 설정 화면에서 언제든 변경하거나 즉시 수동으로 삭제할 수 있습니다.
- 서버의 백업 저장소에는 코드로부터 파생된 조회값과 암호문, 갱신 시각만 저장되며, 이메일·로그인 계정 등 사용자를 특정할 수 있는 다른 정보는 함께 수집하지 않습니다.
- 피드백 데이터는 개발자가 운영하는 개인 서버에 저장되며, 문제 해결 후 삭제됩니다.

## 4. 제3자 제공

차필은 사용자 데이터를 광고, 분석, 또는 기타 목적으로 제3자에게 제공하지 않습니다.

## 5. 문의

개인정보 처리와 관련한 문의는 아래로 연락해 주세요.

이메일: iranto.creative@icloud.com
```

- [ ] **Step 2: 커밋**

```bash
cd /home/iranto/Gitea/chapil
git add docs/privacy.md
git commit -m "docs: 복구코드 백업 도입에 맞춰 개인정보 처리방침 갱신"
```

---

## 최종 확인 (전체 태스크 완료 후)

- [ ] `cd app && .venv/bin/pytest tests/ -v` — 전체 백엔드 테스트 통과
- [ ] `cd frontend && npm test` — 전체 프론트 테스트 통과
- [ ] `cd frontend && npm run lint` — 린트 통과
- [ ] Docker 이미지가 정상 빌드/기동하는지 재확인(Task 4 Step 2와 동일한 절차)
