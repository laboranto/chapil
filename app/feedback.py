"""피드백 저장 — 1건당 마크다운 파일 1개.

sqlite를 쓰지 않는 이유는 docs/superpowers/specs/2026-08-06-feedback-endpoint-design.md 참고.
요약하면 ① 복구 백업이 든 carlog.db를 건드릴 필요가 없고 ② 파일명을 서버가
생성하므로 충돌이 없어 잠금이 필요 없다.
"""

import os
import secrets
from datetime import datetime
from pathlib import Path

# DATA_DIR은 docker-compose에서 이미 주입 중이다(/data). 새 환경변수를 만들지 않는다.
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent / "data"))
FEEDBACK_DIR = DATA_DIR / "feedback"

MAX_TEXT_LEN = 4000
MAX_TRACE_LEN = 4000
MAX_LOGS = 30  # frontend/src/logger.js의 MAX_ENTRIES와 동일

_UNKNOWN = "알 수 없음"


def _row(label, value):
    return f"| {label} | {value if value else _UNKNOWN} |"


def render_markdown(received_at, text, device, logs):
    """피드백 1건을 마크다운 문서로 조판한다."""
    lines = [
        f"# 피드백 {received_at:%Y-%m-%d %H:%M:%S}",
        "",
        "| 항목 | 값 |",
        "|---|---|",
        _row("앱 버전", device.get("appVersion")),
        _row("Android", device.get("android")),
        _row("모델", device.get("model")),
        _row("WebView", device.get("webview")),
        "",
        "## 내용",
        "",
        text.strip(),
        "",
    ]

    if logs:
        lines.append(f"## 오류 기록 ({len(logs)}건)")
        lines.append("")
        for entry in logs:
            lines.append(f"- {entry.get('at') or _UNKNOWN}")
            lines.append("")
            lines.append("```")
            lines.append((entry.get("trace") or "").strip()[:MAX_TRACE_LEN])
            lines.append("```")
            lines.append("")
    else:
        lines.append("## 오류 기록")
        lines.append("")
        lines.append("오류 기록 없음")
        lines.append("")

    return "\n".join(lines)


def save(text, device, logs, received_at=None):
    """마크다운 파일로 저장하고 생성된 경로를 돌려준다.

    파일명은 전적으로 서버가 만든다. 클라이언트 입력을 파일명에 쓰지 않으므로
    경로 순회(path traversal) 여지가 없다.
    """
    received_at = received_at or datetime.now()
    FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)

    # 같은 초에 2건이 들어와도 충돌하지 않도록 난수를 붙인다.
    name = f"{received_at:%Y-%m-%dT%H-%M-%S}-{secrets.token_hex(3)}.md"
    path = FEEDBACK_DIR / name
    path.write_text(
        render_markdown(received_at, text, device, logs[:MAX_LOGS]),
        encoding="utf-8",
    )
    return path
