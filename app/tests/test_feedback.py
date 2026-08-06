from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import feedback as feedback_store


@pytest.fixture(autouse=True)
def clean_feedback_dir():
    """파일명이 초 단위라 같은 초에 쓰인 파일은 정렬로 구분할 수 없다.
    각 테스트가 자기가 만든 파일만 보도록 디렉터리를 비우고 시작한다."""
    feedback_store.FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    for p in feedback_store.FEEDBACK_DIR.glob("*.md"):
        p.unlink()
    yield


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


def _read_saved():
    """저장된 피드백 파일을 (경로, 내용) 목록으로 돌려준다."""
    files = sorted(feedback_store.FEEDBACK_DIR.glob("*.md"))
    return [(p, p.read_text(encoding="utf-8")) for p in files]


def test_saves_markdown_file(client):
    res = client.post("/api/feedback", json={
        "text": "주유 기록이 저장되지 않습니다",
        "appVersion": "26.6.1",
        "android": "14",
        "model": "SM-S911N",
        "webview": "120.0.6099.230",
        "logs": [{"at": "2026-08-06T05:31:44.120Z", "trace": "at foo (index.js:12:34)"}],
    })
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    path, body = _read_saved()[0]
    assert path.suffix == ".md"
    assert "주유 기록이 저장되지 않습니다" in body
    assert "| 앱 버전 | 26.6.1 |" in body
    assert "| 모델 | SM-S911N |" in body
    assert "## 오류 기록 (1건)" in body
    assert "at foo (index.js:12:34)" in body


def test_missing_device_info_renders_unknown(client):
    res = client.post("/api/feedback", json={"text": "기기 정보 없이 보냄"})
    assert res.status_code == 200

    _, body = _read_saved()[0]
    assert "| Android | 알 수 없음 |" in body
    assert "| 모델 | 알 수 없음 |" in body
    assert "오류 기록 없음" in body


def test_rejects_empty_text(client):
    assert client.post("/api/feedback", json={"text": ""}).status_code == 400
    assert client.post("/api/feedback", json={"text": "   "}).status_code == 400


def test_rejects_missing_text(client):
    # text는 필수 필드이므로 pydantic이 422로 거른다
    assert client.post("/api/feedback", json={}).status_code == 422


def test_rejects_overlong_text(client):
    over = "가" * (feedback_store.MAX_TEXT_LEN + 1)
    assert client.post("/api/feedback", json={"text": over}).status_code == 400

    exact = "가" * feedback_store.MAX_TEXT_LEN
    assert client.post("/api/feedback", json={"text": exact}).status_code == 200


def test_truncates_long_trace(client):
    res = client.post("/api/feedback", json={
        "text": "긴 스택트레이스",
        "logs": [{"at": "2026-08-06T00:00:00Z", "trace": "x" * (feedback_store.MAX_TRACE_LEN + 500)}],
    })
    assert res.status_code == 200

    _, body = _read_saved()[0]
    assert "x" * feedback_store.MAX_TRACE_LEN in body
    assert "x" * (feedback_store.MAX_TRACE_LEN + 1) not in body


def test_caps_log_entries(client):
    logs = [{"at": f"2026-08-06T00:00:{i:02d}Z", "trace": f"trace-{i}"} for i in range(40)]
    res = client.post("/api/feedback", json={"text": "로그 많음", "logs": logs})
    assert res.status_code == 200

    _, body = _read_saved()[0]
    assert f"## 오류 기록 ({feedback_store.MAX_LOGS}건)" in body
    assert "trace-39" not in body


def test_filenames_do_not_collide_within_same_second():
    """파일명은 서버가 만들고 난수를 붙이므로 같은 시각에도 덮어쓰지 않는다."""
    fixed = datetime(2026, 8, 6, 14, 32, 10)
    a = feedback_store.save("첫 번째", {}, [], received_at=fixed)
    b = feedback_store.save("두 번째", {}, [], received_at=fixed)
    assert a != b
    assert a.exists() and b.exists()
    assert "첫 번째" in a.read_text(encoding="utf-8")
    assert "두 번째" in b.read_text(encoding="utf-8")


def test_available_in_demo_mode(client, monkeypatch):
    """데모 컨테이너가 수집처이므로 DEMO_MODE에서도 막히면 안 된다."""
    monkeypatch.setenv("DEMO_MODE", "true")
    assert client.post("/api/feedback", json={"text": "데모에서 보냄"}).status_code == 200
