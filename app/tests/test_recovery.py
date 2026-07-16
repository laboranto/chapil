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
