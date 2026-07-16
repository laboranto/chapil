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
