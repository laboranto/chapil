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
