#!/usr/bin/env python3
"""NotoEmoji-Regular.ttf에서 지정 글리프만 뽑아 currentColor SVG로 저장.
사용: python scripts/extract-emoji.py src/assets/symbols

fontTools 4.63.0으로 생성 (SVGPathPen 출력 포맷이 버전에 따라 달라질 수 있음).
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

FONT = Path(__file__).parent / "NotoEmoji-Regular.ttf"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("src/assets/symbols")
PAD = 0.08  # 정사각 변 대비 여백 비율

# 이름: 유니코드 코드포인트. 아이콘 추가는 여기 한 줄.
TARGETS = {
    "home":        0x1F3E0,  # 🏠
    "records":     0x1F9FE,  # 🧾
    "settings":    0x2699,   # ⚙️
    "fuel":        0x26FD,   # ⛽
    "charge":      0x1F50C,  # 🔌
    "maintenance": 0x1F527,  # 🔧
    "other":       0x1F4E6,  # 📦
    "car":         0x1F697,  # 🚗
    "import":      0x1F4E5,  # 📥
    "export":      0x1F4E4,  # 📤
    "copy":        0x1F4CB,  # 📋
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    font = TTFont(FONT)
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    for name, cp in TARGETS.items():
        gname = cmap[cp]
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        xMin, yMin, xMax, yMax = bp.bounds
        sp = SVGPathPen(gs)
        gs[gname].draw(sp)
        d = sp.getCommands()
        cx, cy = (xMin + xMax) / 2, (yMin + yMax) / 2
        box = max(xMax - xMin, yMax - yMin) * (1 + 2 * PAD)
        vx, vy = cx - box / 2, -cy - box / 2  # scale(1 -1) 후 중심은 (cx, -cy)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{vx:.1f} {vy:.1f} {box:.1f} {box:.1f}">'
            f'<path transform="scale(1 -1)" d="{d}" fill="currentColor"/></svg>\n'
        )
        (OUT / f"{name}.svg").write_text(svg)
        print(f"{name}: {gname}")

if __name__ == "__main__":
    main()
