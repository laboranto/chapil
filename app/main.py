from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from database import get_db, init_db
from typing import Optional
from datetime import date

app = FastAPI(title="차계부")
templates = Jinja2Templates(directory="/app/templates")

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


@app.on_event("startup")
def startup():
    init_db()

### 설정 불러오기
@app.get("/settings", response_class=HTMLResponse)
def settings_page(request: Request):
    conn = get_db()
    car_birth = conn.execute("SELECT value FROM settings WHERE key='car_birth'").fetchone()
    conn.close()
    return templates.TemplateResponse("settings.html", {
            "request": request,
            "car_birth": car_birth["value"] if car_birth else ""
    })

@app.post("/settings")
def settings_update(car_birth: str = Form(...)):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('car_birth', ?)", (car_birth,))
    conn.commit()
    conn.close()
    return RedirectResponse("/settings", status_code=303)

# ── 메인 (최근 주유 요약) ─────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    conn = get_db()
    # 출고일자
    row = conn.execute("SELECT value FROM settings WHERE key='car_birth'").fetchone()
    car_birth = date.fromisoformat(row["value"]) if row else date(2020, 2, 26)
    total_days = (date.today()- car_birth).days
    year_avg = total_days / 365
    recent_fuel = conn.execute(
        "SELECT * FROM fuel ORDER BY date DESC, id DESC LIMIT 5"
    ).fetchall()
    last_fuel = recent_fuel[0] if recent_fuel else None

    total_cost = conn.execute(
        "SELECT SUM(amount) as total FROM fuel"
    ).fetchone()["total"] or 0
    total_maint = conn.execute(
        "SELECT SUM(amount) as total FROM maintenance"
    ).fetchone()["total"] or 0
    total_other = conn.execute(
        "SELECT SUM(amount) as total FROM other"
    ).fetchone()["total"] or 0

    avg_economy = conn.execute(
        "SELECT AVG(fuel_economy) as avg FROM fuel WHERE fuel_economy IS NOT NULL AND fuel_economy > 0"
    ).fetchone()["avg"]

    conn.close()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "recent_fuel": recent_fuel,
        "last_fuel": last_fuel,
        "total_cost": total_cost + total_maint + total_other,
        "avg_economy": round(avg_economy, 2) if avg_economy else None,
    })


# ── 주유 ─────────────────────────────────────────────────────────
@app.get("/fuel", response_class=HTMLResponse)
def fuel_list(request: Request):
    conn = get_db()
    rows = conn.execute("SELECT * FROM fuel ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return templates.TemplateResponse("fuel_list.html", {"request": request, "rows": rows})


@app.get("/fuel/new", response_class=HTMLResponse)
def fuel_new(request: Request):
    conn = get_db()
    last = conn.execute("SELECT odometer FROM fuel ORDER BY date DESC, id DESC LIMIT 1").fetchone()
    conn.close()
    return templates.TemplateResponse("fuel_form.html", {
        "request": request,
        "record": None,
        "last_odometer": last["odometer"] if last else 0,
    })


@app.post("/fuel/new")
def fuel_create(
    date: str = Form(...),
    type: str = Form("가득주유"),
    amount: int = Form(...),
    unit_price: Optional[int] = Form(None),
    liters: Optional[float] = Form(None),
    odometer: int = Form(...),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    last = conn.execute(
        "SELECT odometer, liters FROM fuel ORDER BY date DESC, id DESC LIMIT 1"
    ).fetchone()

    interval_km = None
    fuel_economy = None
    if last:
        interval_km = odometer - last["odometer"]
        if liters and liters > 0 and interval_km > 0:
            fuel_economy = round(interval_km / liters, 2)

    conn.execute(
        "INSERT INTO fuel (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, memo) VALUES (?,?,?,?,?,?,?,?,?)",
        (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, memo),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/fuel", status_code=303)


@app.get("/fuel/{record_id}/edit", response_class=HTMLResponse)
def fuel_edit(request: Request, record_id: int):
    conn = get_db()
    record = conn.execute("SELECT * FROM fuel WHERE id=?", (record_id,)).fetchone()
    conn.close()
    if not record:
        raise HTTPException(404)
    return templates.TemplateResponse("fuel_form.html", {"request": request, "record": record, "last_odometer": None})


@app.post("/fuel/{record_id}/edit")
def fuel_update(
    record_id: int,
    date: str = Form(...),
    type: str = Form("가득주유"),
    amount: int = Form(...),
    unit_price: Optional[int] = Form(None),
    liters: Optional[float] = Form(None),
    odometer: int = Form(...),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    conn.execute(
        "UPDATE fuel SET date=?, type=?, amount=?, unit_price=?, liters=?, odometer=?, memo=? WHERE id=?",
        (date, type, amount, unit_price, liters, odometer, memo, record_id),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/fuel", status_code=303)


@app.post("/fuel/{record_id}/delete")
def fuel_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM fuel WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return RedirectResponse("/fuel", status_code=303)


# ── 정비 ─────────────────────────────────────────────────────────
@app.get("/maintenance", response_class=HTMLResponse)
def maint_list(request: Request):
    conn = get_db()
    rows = conn.execute("SELECT * FROM maintenance ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return templates.TemplateResponse("maintenance_list.html", {"request": request, "rows": rows})


@app.get("/maintenance/new", response_class=HTMLResponse)
def maint_new(request: Request):
    conn = get_db()
    last = conn.execute("SELECT odometer FROM fuel ORDER BY date DESC, id DESC LIMIT 1").fetchone()
    conn.close()
    return templates.TemplateResponse("maintenance_form.html", {
        "request": request,
        "record": None,
        "items": MAINTENANCE_ITEMS,
        "last_odometer": last["odometer"] if last else 0,
    })


@app.post("/maintenance/new")
def maint_create(
    date: str = Form(...),
    item: str = Form(...),
    amount: int = Form(0),
    odometer: int = Form(...),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    conn.execute(
        "INSERT INTO maintenance (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
        (date, "정비", item, amount, odometer, memo),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/maintenance", status_code=303)


@app.get("/maintenance/{record_id}/edit", response_class=HTMLResponse)
def maint_edit(request: Request, record_id: int):
    conn = get_db()
    record = conn.execute("SELECT * FROM maintenance WHERE id=?", (record_id,)).fetchone()
    conn.close()
    if not record:
        raise HTTPException(404)
    return templates.TemplateResponse("maintenance_form.html", {
        "request": request, "record": record, "items": MAINTENANCE_ITEMS, "last_odometer": None
    })


@app.post("/maintenance/{record_id}/edit")
def maint_update(
    record_id: int,
    date: str = Form(...),
    item: str = Form(...),
    amount: int = Form(0),
    odometer: int = Form(...),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    conn.execute(
        "UPDATE maintenance SET date=?, item=?, amount=?, odometer=?, memo=? WHERE id=?",
        (date, item, amount, odometer, memo, record_id),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/maintenance", status_code=303)


@app.post("/maintenance/{record_id}/delete")
def maint_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM maintenance WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return RedirectResponse("/maintenance", status_code=303)


# ── 기타 ─────────────────────────────────────────────────────────
@app.get("/other", response_class=HTMLResponse)
def other_list(request: Request):
    conn = get_db()
    rows = conn.execute("SELECT * FROM other ORDER BY date DESC, id DESC").fetchall()
    conn.close()
    return templates.TemplateResponse("other_list.html", {"request": request, "rows": rows})


@app.get("/other/new", response_class=HTMLResponse)
def other_new(request: Request):
    conn = get_db()
    last = conn.execute("SELECT odometer FROM fuel ORDER BY date DESC, id DESC LIMIT 1").fetchone()
    conn.close()
    return templates.TemplateResponse("other_form.html", {
        "request": request,
        "record": None,
        "items": OTHER_ITEMS,
        "last_odometer": last["odometer"] if last else 0,
    })


@app.post("/other/new")
def other_create(
    date: str = Form(...),
    item: str = Form(...),
    amount: int = Form(0),
    odometer: Optional[int] = Form(None),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    conn.execute(
        "INSERT INTO other (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
        (date, "기타", item, amount, odometer, memo),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/other", status_code=303)


@app.get("/other/{record_id}/edit", response_class=HTMLResponse)
def other_edit(request: Request, record_id: int):
    conn = get_db()
    record = conn.execute("SELECT * FROM other WHERE id=?", (record_id,)).fetchone()
    conn.close()
    if not record:
        raise HTTPException(404)
    return templates.TemplateResponse("other_form.html", {
        "request": request, "record": record, "items": OTHER_ITEMS, "last_odometer": None
    })


@app.post("/other/{record_id}/edit")
def other_update(
    record_id: int,
    date: str = Form(...),
    item: str = Form(...),
    amount: int = Form(0),
    odometer: Optional[int] = Form(None),
    memo: Optional[str] = Form(None),
):
    conn = get_db()
    conn.execute(
        "UPDATE other SET date=?, item=?, amount=?, odometer=?, memo=? WHERE id=?",
        (date, item, amount, odometer, memo, record_id),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/other", status_code=303)


@app.post("/other/{record_id}/delete")
def other_delete(record_id: int):
    conn = get_db()
    conn.execute("DELETE FROM other WHERE id=?", (record_id,))
    conn.commit()
    conn.close()
    return RedirectResponse("/other", status_code=303)
