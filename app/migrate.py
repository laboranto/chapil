"""
마이클 앱에서 내보낸 ODS 파일을 SQLite DB로 마이그레이션
사용법: python migrate.py /path/to/차계부_리포트.ods
"""
import sys
from odf.opendocument import load
from odf.table import Table, TableRow, TableCell
from odf.text import P
from database import get_db, init_db


def get_cell_value(cell):
    val = cell.getAttribute("value")
    if val:
        return val
    result = []
    for p in cell.getElementsByType(P):
        for node in p.childNodes:
            if hasattr(node, "data"):
                result.append(node.data)
    return "".join(result).strip()


def to_int(val):
    if not val:
        return None
    return int(float(str(val).replace(",", "")))


def to_float(val):
    if not val:
        return None
    return float(str(val).replace(",", ""))


def parse_sheet(doc, sheet_name):
    sheets = doc.spreadsheet.getElementsByType(Table)
    for sheet in sheets:
        if sheet.getAttribute("name") == sheet_name:
            rows = sheet.getElementsByType(TableRow)
            data = []
            for row in rows:
                cells = row.getElementsByType(TableCell)
                data.append([get_cell_value(c) for c in cells])
            return data
    return []


def migrate(ods_path):
    init_db()
    doc = load(ods_path)
    conn = get_db()

    # 주유
    fuel_rows = parse_sheet(doc, "주유(충전)")
    fuel_inserted = 0
    for row in fuel_rows[1:]:  # 헤더 skip
        if not row or not row[0]:
            continue
        try:
            date = row[0].replace(".", "-")
            ftype = row[1] if len(row) > 1 else "가득주유"
            amount = to_int(row[2]) or 0
            unit_price = to_int(row[3])
            liters = to_float(row[4])
            odometer = to_int(row[6]) or 0
            interval_km = to_int(row[8])
            fuel_economy = to_float(row[9])
            memo = row[10] if len(row) > 10 else ""
            conn.execute(
                "INSERT INTO fuel (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, memo) VALUES (?,?,?,?,?,?,?,?,?)",
                (date, ftype, amount, unit_price, liters, odometer, interval_km, fuel_economy, memo),
            )
            fuel_inserted += 1
        except Exception as e:
            print(f"  주유 행 오류: {row} -> {e}")

    # 정비
    maint_rows = parse_sheet(doc, "정비")
    maint_inserted = 0
    for row in maint_rows[1:]:
        if not row or not row[0]:
            continue
        try:
            date = row[0].replace(".", "-")
            category = row[1] if len(row) > 1 else "정비"
            item = row[2] if len(row) > 2 else ""
            amount = to_int(row[3]) or 0
            odometer = to_int(row[4]) or 0
            memo = row[6] if len(row) > 6 else ""
            conn.execute(
                "INSERT INTO maintenance (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
                (date, category, item, amount, odometer, memo),
            )
            maint_inserted += 1
        except Exception as e:
            print(f"  정비 행 오류: {row} -> {e}")

    # 기타
    other_rows = parse_sheet(doc, "기타")
    other_inserted = 0
    for row in other_rows[1:]:
        if not row or not row[0]:
            continue
        try:
            date = row[0].replace(".", "-")
            category = row[1] if len(row) > 1 else "기타"
            item = row[2] if len(row) > 2 else ""
            amount = to_int(row[3]) or 0
            odometer = to_int(row[4])
            memo = row[6] if len(row) > 6 else ""
            conn.execute(
                "INSERT INTO other (date, category, item, amount, odometer, memo) VALUES (?,?,?,?,?,?)",
                (date, category, item, amount, odometer, memo),
            )
            other_inserted += 1
        except Exception as e:
            print(f"  기타 행 오류: {row} -> {e}")

    conn.commit()
    conn.close()
    print(f"마이그레이션 완료: 주유 {fuel_inserted}건, 정비 {maint_inserted}건, 기타 {other_inserted}건")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python migrate.py <ods파일경로>")
        sys.exit(1)
    migrate(sys.argv[1])
