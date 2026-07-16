from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
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
