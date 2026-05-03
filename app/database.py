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
        CREATE TABLE IF NOT EXISTS fuel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT '가득주유',
            amount INTEGER NOT NULL,
            unit_price INTEGER,
            liters REAL,
            odometer INTEGER NOT NULL,
            interval_km INTEGER,
            fuel_economy REAL,
            location TEXT,
            memo TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS maintenance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            item TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            odometer INTEGER NOT NULL,
            location TEXT,
            memo TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_birth', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_type', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_brand', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_model', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_plate', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('car_fuel', '');

        CREATE TABLE IF NOT EXISTS other (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            item TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            odometer INTEGER,
            location TEXT,
            memo TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
    """)

    # 기존 DB에 location 컬럼이 없으면 추가 (운영 중인 DB 대응)
    for table in ("fuel", "maintenance", "other"):
        cols = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        if "location" not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN location TEXT")

    conn.commit()
    conn.close()
