#!/usr/bin/env python3
"""테마별 아이콘 SVG를 currentColor 심볼로 정규화해 src/assets/symbols/<테마>/에 쓴다.

세 출처는 칠하는 방식이 다르다 — material·breeze는 면(fill), lucide는 선(stroke).
합쳐서 하나로 만들 수 없으므로 출처의 칠 방식과 원래 viewBox를 그대로 보존하고,
색만 currentColor로 통일한다. 아이콘 크기는 CSS가 width/height로 정하므로
viewBox가 22든 24든 같은 크기로 그려진다.

사용: python scripts/build-icons.py [출력경로]
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)

HOME = Path.home()
# ponytail: 출처를 로컬 클론·시스템 경로에 의존한다. CI에서 돌릴 일이 생기면 인자로 넘긴다.
MATERIAL = HOME / "gitget/material-design-icons"
LUCIDE = HOME / "gitget/lucide/icons"
BREEZE = Path("/usr/share/icons/breeze")

# 앱에서 쓰는 이름 → 출처별 아이콘. 아이콘 추가는 여기 한 줄.
# breeze가 None인 것은 대응 아이콘이 없어 손으로 그린 것이다(breeze-custom/ 참고).
TARGETS = {
    #                material            breeze                          lucide(apple)
    "fuel":         ("local_gas_station", None,                          "fuel"),
    "charge":       ("ev_station",        None,                          "zap"),
    "maintenance":  ("build",             "actions/22/tools",            "wrench"),
    "other":        ("inventory_2",       "actions/22/package",          "package"),
    "car":          ("directions_car",    "applets/22/car",              "car"),
    "settings":     ("settings",          "actions/22/configure",        "settings"),
    "import":       ("download",          "actions/22/document-import",  "download"),
    "export":       ("upload",            "actions/22/document-export",  "upload"),
    "copy":         ("content_paste",     "actions/22/edit-copy",        "clipboard-copy"),
}

GEOMETRY = {"path", "circle", "ellipse", "rect", "line", "polygon", "polyline"}
DROP = {"defs", "style", "metadata", "title", "desc"}
# 선으로 그리는 출처에서 살려야 하는 것들. 색은 currentColor로 덮는다.
STROKE_ATTRS = ("stroke-width", "stroke-linecap", "stroke-linejoin")

def tag(el):
    return el.tag.split("}")[-1]

def collect(el, out):
    """geometry 엘리먼트만 평평하게 모은다. <g>는 변환이 없을 때만 통과시킨다."""
    for child in el:
        t = tag(child)
        if t in DROP:
            continue
        if t == "g":
            if child.get("transform"):
                sys.exit(f"  transform 걸린 <g>는 못 편다: {child.get('transform')}")
            collect(child, out)
        elif t in GEOMETRY:
            # material은 24×24 투명 경계용 path를 fill="none"으로 깔아둔다.
            # 칠을 루트로 올리면 그게 통째로 칠해져 아이콘이 검은 사각형이 된다.
            # 제 색이 none이면서 선도 없는 엘리먼트는 그릴 게 없다는 뜻이다.
            # (breeze의 style은 stroke:none을 달고 있으니 fill만 정확히 본다)
            m = re.search(r"(?:^|;)\s*fill\s*:\s*([^;]+)", child.get("style", ""))
            own_fill = (m.group(1).strip() if m else None) or child.get("fill")
            if own_fill == "none" and not child.get("stroke"):
                continue
            out.append(child)
        else:
            sys.exit(f"  모르는 엘리먼트 <{t}> — 단색 심볼이 아닌 듯하다")

def normalize(src: Path) -> str:
    root = ET.fromstring(src.read_text())

    # viewBox가 없으면 width/height로 만든다(breeze의 tools.svg 같은 경우).
    vb = root.get("viewBox")
    if not vb:
        w, h = root.get("width"), root.get("height")
        if not (w and h):
            sys.exit("  viewBox도 width/height도 없다")
        vb = f"0 0 {float(w):g} {float(h):g}"

    els = []
    collect(root, els)
    if not els:
        sys.exit("  그릴 게 없다")

    # 선으로 그리는가(lucide), 면으로 칠하는가(material·breeze).
    stroked = root.get("stroke") is not None and root.get("fill") in (None, "none")
    paint = ' fill="none" stroke="currentColor"' if stroked else ' fill="currentColor"'
    if stroked:
        paint += "".join(f' {a}="{root.get(a)}"' for a in STROKE_ATTRS if root.get(a))

    body = []
    for el in els:
        # class·id·style·색 지정은 전부 버린다 — 칠은 루트에서 한 번만 한다.
        attrs = {k: v for k, v in el.attrib.items()
                 if k not in ("class", "id", "style", "fill", "stroke", "fill-opacity")}
        if any("url(" in v for v in attrs.values()):
            sys.exit("  url(#…) 참조가 있다 — 그라데이션 든 풀컬러 아이콘은 못 쓴다")
        # 좌표 사이 공백을 줄여 파일을 작게
        attrs = {k: re.sub(r"\s+", " ", v).strip() for k, v in attrs.items()}
        body.append(f"<{tag(el)} " + " ".join(f'{k}="{v}"' for k, v in attrs.items()) + "/>")

    return (f'<svg xmlns="{SVG}" viewBox="{vb}"{paint}>' + "".join(body) + "</svg>\n")

def resolve(theme, name, key):
    if key is None:
        return None
    if theme == "material":
        # 카테고리(action/maps/…)가 아이콘마다 달라 glob으로 찾는다.
        hits = sorted(MATERIAL.glob(f"src/*/{key}/materialiconsround/24px.svg"))
        if len(hits) != 1:
            sys.exit(f"{name}: material {key}를 {len(hits)}개 찾음")
        return hits[0]
    if theme == "breeze":
        return BREEZE / f"{key}.svg"
    return LUCIDE / f"{key}.svg"

def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("src/assets/symbols")
    for i, theme in enumerate(("material", "breeze", "apple")):
        (out / theme).mkdir(parents=True, exist_ok=True)
        for name, keys in TARGETS.items():
            src = resolve(theme, name, keys[i])
            if src is None:
                print(f"  {theme}/{name}: 손으로 그린 것 — 건너뜀")
                continue
            if not src.exists():
                sys.exit(f"{theme}/{name}: 없음 — {src}")
            print(f"  {theme}/{name}: {src}")
            (out / theme / f"{name}.svg").write_text(normalize(src))

if __name__ == "__main__":
    main()
