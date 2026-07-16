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
