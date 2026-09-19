#!/usr/bin/env python3
"""material-design-icons(Apache-2.0) 저장소의 SVG를 currentColor 단일 path로 정규화해 복사.
사용: python scripts/build-icons.py [출력경로] [저장소경로]
"""
import re
import sys
from pathlib import Path

STYLE = "materialiconsround"

# 앱에서 쓰는 이름: material 아이콘 이름. 아이콘 추가는 여기 한 줄.
TARGETS = {
    "home":        "home",
    "records":     "receipt_long",
    "settings":    "settings",
    "fuel":        "local_gas_station",
    "charge":      "ev_station",
    "maintenance": "build",
    "other":       "inventory_2",
    "car":         "directions_car",
    "import":      "download",
    "export":      "upload",
    "copy":        "content_paste",
    "kebab":       "more_vert",
}

def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("src/assets/symbols")
    # ponytail: 저장소 경로를 로컬 클론에 의존. CI에서 돌릴 일 생기면 인자로 넘기거나 서브모듈로.
    repo = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.home() / "gitget/material-design-icons"
    out.mkdir(parents=True, exist_ok=True)
    for name, icon in TARGETS.items():
        # 카테고리(action/maps/...)가 아이콘마다 달라서 glob으로 찾는다.
        srcs = sorted((repo / "src").glob(f"*/{icon}/{STYLE}/24px.svg"))
        if len(srcs) != 1:
            sys.exit(f"{icon}: {STYLE} 24px.svg를 {len(srcs)}개 찾음")
        svg = srcs[0].read_text()
        # 투명 배경용 <path fill="none">/<rect fill="none">는 버리고, 나머지 path의
        # d를 이어붙여 하나로 만든다(같은 fill-rule이라 서브패스 연결과 동일).
        tags = [t for t in re.findall(r'<path\b[^>]*?/>', svg) if 'fill="none"' not in t]
        d = " ".join(re.search(r'\bd="([^"]+)"', t).group(1) for t in tags)
        if not d:
            sys.exit(f"{icon}: 본체 path 없음")
        (out / f"{name}.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
            f'<path d="{d}" fill="currentColor"/></svg>\n'
        )
        print(f"{name}: {srcs[0].relative_to(repo)}")

if __name__ == "__main__":
    main()
