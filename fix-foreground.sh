#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
BASE="$ROOT/android/app/src/main/res"
SVG_LIGHT="$ROOT/frontend/public/icons/icon_light.svg"
SVG_DARK="$ROOT/frontend/public/icons/icon_dark.svg"

# 1단계: SVG → assets PNG export
echo "[1/4] SVG → PNG export..."
sed 's/fill:#ffffff;/fill:none;/' "$SVG_LIGHT" > /tmp/chapil_fg_light.svg
sed 's/fill:#404040;/fill:none;/' "$SVG_DARK" > /tmp/chapil_fg_dark.svg

inkscape --export-filename="$ROOT/assets/icon-only.png"           --export-width=1024 --export-height=1024 "$SVG_LIGHT"              2>/dev/null
inkscape --export-filename="$ROOT/assets/icon-only-dark.png"      --export-width=1024 --export-height=1024 "$SVG_DARK"               2>/dev/null
inkscape --export-filename="$ROOT/assets/icon-foreground.png"     --export-width=1024 --export-height=1024 /tmp/chapil_fg_light.svg  2>/dev/null
inkscape --export-filename="$ROOT/assets/icon-foreground-dark.png" --export-width=1024 --export-height=1024 /tmp/chapil_fg_dark.svg  2>/dev/null

# 2단계: capacitor-assets로 아이콘 생성
echo "[2/4] capacitor-assets generate..."
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#ffffff' \
  --iconBackgroundColorDark '#404040' 2>/dev/null

# 3단계: foreground를 108dp 규격으로 재생성 (capacitor-assets 버그 우회)
echo "[3/4] foreground 108dp 규격 재생성..."
declare -A SIZES=([ldpi]=81 [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)

for density in "${!SIZES[@]}"; do
  size=${SIZES[$density]}
  ffmpeg -i "$ROOT/assets/icon-foreground.png" \
    -vf "scale=${size}:${size}:flags=lanczos" -pix_fmt rgba -y \
    "$BASE/mipmap-$density/ic_launcher_foreground.png" 2>/dev/null
  if [ -d "$BASE/mipmap-night-$density" ]; then
    ffmpeg -i "$ROOT/assets/icon-foreground-dark.png" \
      -vf "scale=${size}:${size}:flags=lanczos" -pix_fmt rgba -y \
      "$BASE/mipmap-night-$density/ic_launcher_foreground.png" 2>/dev/null
  fi
done

# 4단계: XML inset 제거 + monochrome 레이어 추가 (capacitor-assets가 매번 덮어씌움)
echo "[4/4] XML inset 제거 + monochrome 추가..."
ANYDPI="$BASE/mipmap-anydpi-v26"
for xml in "$ANYDPI/ic_launcher.xml" "$ANYDPI/ic_launcher_round.xml"; do
  cat > "$xml" << 'XMLEOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
XMLEOF
done

ANYDPI_NIGHT="$BASE/mipmap-night-anydpi-v26"
for xml in "$ANYDPI_NIGHT/ic_launcher.xml" "$ANYDPI_NIGHT/ic_launcher_round.xml"; do
  cat > "$xml" << 'XMLEOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
XMLEOF
done

echo "완료."
