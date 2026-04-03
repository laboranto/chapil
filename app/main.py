from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
from datetime import date
from pathlib import Path
import os
from database import get_db, init_db

BASE_DIR = Path(__file__).parent

# STATIC_DIR: 로컬에서는 ../static, Docker에서는 ENV STATIC_DIR=/app/static 으로 주입된다.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", str(BASE_DIR.parent / "static")))

# DIST_DIR: React 빌드 결과물 경로. Docker 빌드 시에만 존재한다.
DIST_DIR = BASE_DIR / "frontend" / "dist"


# ── lifespan: 앱 시작/종료 시점에 실행될 코드를 정의 ─────────────────
# 기존 @app.on_event("startup") 방식은 deprecated 되었고,
# 현재 FastAPI 권장 방식은 contextlib.asynccontextmanager를 사용한 lifespan이다.
# yield 이전: 앱 시작 시 실행 / yield 이후: 앱 종료 시 실행
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="차계부", lifespan=lifespan)

# 정적 파일 서빙 유지 (아이콘, CSS 등)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# CORS 미들웨어: React SPA가 다른 포트(예: localhost:3000)에서 이 API를 호출할 수 있도록 허용.
# 배포 시에는 allow_origins를 실제 도메인으로 제한할 것.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# 정비/기타 항목 선택지 — 프론트엔드 폼에서 드롭다운으로 사용
MAINTENANCE_ITEMS = [
    "엔진오일 및 오일필터",
    "에어클리너 필터",
    "에어컨필터(항균필터)",
    "점화플러그",
    "브레이크 패드 (앞)",
    "브레이크 패드 (뒤)",
    "브레이크 오일",
    "타이어",
    "타이어 위치",
    "와이퍼 블레이드",
    "엔진부동액(냉각수)",
    "에어컨(냉매, 콤프레서, 콘덴서 등)",
    "배터리",
    "점검",
    "일반수리",
    "기타",
]

OTHER_ITEMS = [
    "자동차 보험",
    "자동차검사",
    "세차",
    "주차비",
    "통행료",
    "실외용품",
    "실내용품",
    "교통범칙금",
    "기타",
]


# ── Pydantic 요청 바디 모델 ───────────────────────────────────────────
# Pydantic 모델은 POST/PUT 요청의 JSON 바디를 자동으로 파싱하고 타입을 검증한다.
# 기존의 Form(...) 방식을 대체한다.
# Optional[타입] = None : 값이 없어도 되는 필드

class FuelBody(BaseModel):
    date: str
    type: str = "가득주유"
    amount: int
    unit_price: Optional[int] = None
    liters: Optional[float] = None
    odometer: int
    memo: Optional[str] = None


class MaintenanceBody(BaseModel):
    date: str
    item: str
    amount: int = 0
    odometer: int
    memo: Optional[str] = None


class OtherBody(BaseModel):
    date: str
    item: str
    amount: int = 0
    odometer: Optional[int] = None
    memo: Optional[str] = None


class SettingsBody(BaseModel):
    car_birth: str


# ── 대시보드 ──────────────────────────────────────────────────────────
# 메인 화면에 필요한 요약 데이터를 한 번에 반환한다.
@app.get("/api/dashboard")
def get_dashboard():
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key='car_birth'").fetchone()
    car_birth = date.fromisoformat(row["value"]) if row else date(2020, 2, 26)
    total_days = (date.today() - car_birth).days

    recent_fuel = conn.execute(
        "SELECT * FROM fuel ORDER BY date DESC, id DESC LIMIT 5"
    ).fetchall()

    total_fuel  = conn.execute("SELECT SUM(amount) as total FROM fuel").fetchone()["total"] or 0
    total_maint = conn.execute("SELECT SUM(amount) as total FROM maintenance").fetchone()["total"] or 0
    total_other = conn.execute("SELECT SUM(amount) as total FROM other").fetchone()["total"] or 0

    avg_economy = conn.execute(
        "SELECT AVG(fuel_economy) as avg FROM fuel WHERE fuel_economy IS NOT NULL AND fuel_economy > 0"
    ).fetchone()["avg"]

    conn.close()
    return {
        "car_birth": str(car_birth),
        "total_days": total_days,
        # sqlite3.Row는 JSON 직렬화가 안 되므로 dict()로 변환
        "recent_fuel": [dict(r) for r in recent_fuel],
        "total_cost": total_fuel + total_maint + total_other,
        "avg_economy": round(avg_economy, 2) if avg_economy else None,
    }


# ── 설정 ──────────────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings():
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key='car_birth'").fetchone()
    conn.close()
    return {"car_birth": row["value"] if row else ""}


@app.put("/api/settings")
def update_settings(body: SettingsBody):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('car_birth', ?)",
        (body.car_birth,),
    )
    conn.commit()
    conn.close()
    return {"car_birth": body.car_birth}


# ── 주유 ──────────────────────────────────────────────────────────────
@app.get("/api/fuel")
def fuel_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM fuel ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# status_code=201: REST 관례상 리소스 생성 성공 시 201 Created를 반환한다.
@app.post("/api/fuel", status_code=201)
def fuel_create(body: FuelBody):
    conn = get_db()
    last = conn.execute(
        "SELECT odometer, liters FROM fuel ORDER BY date DESC, id DESC LIMIT 1"
    ).fetchone()

    interval_km = None
    fuel_economy = None
    if last:
        interval_km = body.odometer - last["odometer"]
        if body.liters and body.liters > 0 and interval_km > 0:
            fuel_economy = round(interval_km / body.liters, 2)

    cursor = conn.execute(
        "INSERT INTO fuel (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, memo)"
        " VALUES (?,?,?,?,?,?,?,?,?)",
        (body.date, body.type, body.amount, body.unit_price, body.liters,
         body.odometer, interval_km, fuel_economy, body.memo),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM fuel WHERE id=?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/fuel/{record_id}")
def fuel_update(record_id: int, body: FuelBody):
    conn = get_db()
    if not conn.execute("SELECT id FROM fuel WHERE id=?", (record_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다.")

    conn.execute(
        "UPDATE fuel SET date=?, type=?, amount=?, unit_price=?, liters=?, odometer=?, memo=? WHERE id=?",
        (body.date, body.type, body.amount, body.unit_price, body.liters,
         body.odometer, body.memo, record_id),
    )

    # 수정된 기록의 앞뒤 레코드를 찾아 연비를 재계산한다.
    prev = conn.execute(
        "SELECT odometer, liters FROM fuel WHERE date <= ? AND id != ? ORDER BY date DESC, id DESC LIMIT 1",
        (body.date, record_id),
    ).fetchone()
    next_ = conn.execute(
        "SELECT id, odometer, liters FROM fuel WHERE date >= ? AND id != ? ORDER BY date ASC, id ASC LIMIT 1",
        (body.date, record_id),
    ).fetchone()

    interval_km = None
    fuel_economy = None
    if prev:
        interval_km = body.odometer - prev["odometer"]
        if body.liters and body.liters > 0 and interval_km > 0:
            fuel_economy = round(interval_km / body.liters, 2)
    conn.execute(
        "UPDATE fuel SET interval_km=?, fuel_economy=? WHERE id=?",
        (interval_km, fuel_economy, record_id),
    )

    # 다음 기록의 연비도 현재 수정값 기준으로 다시 계산
    if next_:
        next_interval = next_["odometer"] - body.odometer
        next_economy = None
        if next_["liters"] and next_["liters"] > 0 and next_interval > 0:
            next_economy = round(next_interval / next_["liters"], 2)
        conn.execute(
            "UPDATE fuel SET interval_km=?, fuel_economy=? WHERE id=?",
            (next_interval, next_economy, next_["id"]),
        )

    conn.commit()
    row = conn.execute("SELECT * FROM fuel WHERE id=?", (record_id,)).fetchone()
    conn.close()
    return dict(row)


# status_code=204: 삭제 성공 시 본문 없이 204 No Content를 반환한다.
@app.delete("/api/fuel/{record_id}", status_code=204)
def fuel_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM fuel WHERE id=?", (record_id,))
    conn.commit()
    conn.close()


# ── 정비 ──────────────────────────────────────────────────────────────
# 주의: /api/maintenance/items 는 반드시 /api/maintenance/{record_id} 보다
# 먼저 정의해야 한다. 그렇지 않으면 "items"가 record_id로 잘못 매칭된다.
@app.get("/api/maintenance/items")
def maintenance_items():
    return MAINTENANCE_ITEMS


@app.get("/api/maintenance")
def maintenance_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM maintenance ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/maintenance", status_code=201)
def maintenance_create(body: MaintenanceBody):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO maintenance (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
        (body.date, "정비", body.item, body.amount, body.odometer, body.memo),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM maintenance WHERE id=?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/maintenance/{record_id}")
def maintenance_update(record_id: int, body: MaintenanceBody):
    conn = get_db()
    if not conn.execute("SELECT id FROM maintenance WHERE id=?", (record_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다.")
    conn.execute(
        "UPDATE maintenance SET date=?, item=?, amount=?, odometer=?, memo=? WHERE id=?",
        (body.date, body.item, body.amount, body.odometer, body.memo, record_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM maintenance WHERE id=?", (record_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/maintenance/{record_id}", status_code=204)
def maintenance_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM maintenance WHERE id=?", (record_id,))
    conn.commit()
    conn.close()


# ── 기타 ──────────────────────────────────────────────────────────────
@app.get("/api/other/items")
def other_items():
    return OTHER_ITEMS


@app.get("/api/other")
def other_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM other ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/other", status_code=201)
def other_create(body: OtherBody):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO other (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
        (body.date, "기타", body.item, body.amount, body.odometer, body.memo),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM other WHERE id=?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/other/{record_id}")
def other_update(record_id: int, body: OtherBody):
    conn = get_db()
    if not conn.execute("SELECT id FROM other WHERE id=?", (record_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다.")
    conn.execute(
        "UPDATE other SET date=?, item=?, amount=?, odometer=?, memo=? WHERE id=?",
        (body.date, body.item, body.amount, body.odometer, body.memo, record_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM other WHERE id=?", (record_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/other/{record_id}", status_code=204)
def other_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM other WHERE id=?", (record_id,))
    conn.commit()
    conn.close()


# ── React SPA 서빙 ────────────────────────────────────────────────────
# Docker 빌드 시 dist/ 가 존재할 때만 활성화된다.
# 로컬 개발 환경에서는 Vite dev server(5173)가 프론트를 담당하므로 이 블록은 실행되지 않는다.
#
# /{full_path:path} : 위에서 정의한 /api/* 라우트에 매칭되지 않은
#                     모든 경로를 여기서 받아 처리한다.
# - dist/ 안에 해당 파일이 실제로 있으면 그 파일을 반환 (JS, CSS, 아이콘 등)
# - 없으면 index.html을 반환 → React Router가 클라이언트 사이드에서 라우팅 처리
if DIST_DIR.exists():
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        target = DIST_DIR / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")
