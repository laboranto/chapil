// 원형 유리의 굴절을 SVG 변위 맵으로 만들어 backdrop-filter에 물린다.
// 방법은 kube.io/blog/liquid-glass-css-svg 를 따랐다.
//
// Liquid Glass는 블러가 아니라 굴절이다. 블러만 씌운 건 Aqua·Aero 시절의 옛
// 글래스모피즘이고, 애플이 한 단계 올린 지점이 실시간 굴절이다.
//
// 지금 이게 도는 곳은 Chrome/Edge뿐이다 — SVG 필터를 backdrop-filter로 쓰는 건
// WebKit Bug 245510으로 막혀 있고(PR #68614 대기), Firefox도 미지원이다.
// 못 쓰면 아무것도 안 하고 조용히 빠지며, index.css의 림·스페큘러 층이 그대로
// 남는다. 그 상태는 "유리 농도를 꺼둔 iOS"로 읽히므로 깨진 화면이 아니다.
// WebKit이 열어주면 이 파일은 그대로 두고 저절로 켜진다.

const ID = 'chapil-glass'
const N_GLASS = 1.5   // 유리의 굴절률(공기 1)

// 볼록 베젤. u=0이 바깥 모서리, u=1이 베젤 끝(평평한 면의 시작).
// 사분원이라 모서리에서 접선이 수직에 가까워져 가장자리가 세게 휜다.
const surface = (u) => Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)))

// 베젤 위 한 점에서 빛이 밀려나는 거리(px).
// 표면 기울기 → 입사각 → 스넬 법칙 → 굴절각, 그 편차만큼 유리 두께를 통과하며 밀린다.
function displacement(u, bezel, thickness) {
  const d = 1e-3
  const slope =
    ((surface(Math.min(1, u + d)) - surface(Math.max(0, u - d))) / (2 * d)) * (thickness / bezel)
  const t1 = Math.atan(Math.abs(slope))
  const t2 = Math.asin(Math.sin(t1) / N_GLASS)
  return thickness * surface(u) * Math.tan(t1 - t2)
}

// size×size 원형 렌즈의 변위 맵을 RGBA로 굽는다.
// R=X, G=Y, 128이 중립. 8비트라 한 축에 ±127px가 한계다.
function bakeMap(size, bezel, thickness) {
  const r = size / 2
  // 반지름 위에서 한 번만 계산해 두고 각도로 돌려 쓴다 — 원이라 변위가 테두리에 직교한다.
  const steps = 128
  const mags = Array.from({ length: steps }, (_, i) => displacement(i / (steps - 1), bezel, thickness))
  const max = Math.max(...mags)
  if (!(max > 0)) return null

  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const img = cv.getContext('2d').createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r
      const dist = Math.hypot(dx, dy)
      const fromEdge = r - dist
      let nx = 0, ny = 0
      if (fromEdge >= 0 && fromEdge < bezel && dist > 0) {
        const u = fromEdge / bezel
        const m = mags[Math.min(steps - 1, Math.round(u * (steps - 1)))] / max
        // 볼록 렌즈는 바깥쪽 배경을 안으로 끌어온다 — 바깥 방향에서 샘플한다.
        nx = (dx / dist) * m
        ny = (dy / dist) * m
      }
      const o = (y * size + x) * 4
      img.data[o]     = Math.round(128 + nx * 127)
      img.data[o + 1] = Math.round(128 + ny * 127)
      img.data[o + 2] = 128
      img.data[o + 3] = 255
    }
  }
  cv.getContext('2d').putImageData(img, 0, 0)
  return { canvas: cv, max }
}

export function installGlassRefraction({ size = 56, bezel = 12, thickness = 14 } = {}) {
  // 파싱만 통과하고 렌더는 안 하는 브라우저가 있으므로 이 검사만으로는 부족하지만,
  // 안 되는 쪽에서 필터가 걸려 배경이 사라지는 일은 없다(필터가 무시될 뿐이다).
  if (typeof CSS === 'undefined' || !CSS.supports('backdrop-filter', 'url(#x)')) return false
  if (document.getElementById(ID)) return true

  const baked = bakeMap(size, bezel, thickness)
  if (!baked) return false

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:absolute;pointer-events:none'
  // 필터는 기본이 linearRGB다. 같은 회색값이 다른 거리를 밀어내므로 sRGB로 강제한다.
  // feImage에 data URI를 쓰면 WebKit이 조용히 거부하므로 blob으로 넘긴다.
  svg.innerHTML =
    `<filter id="${ID}" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"` +
    ` x="0" y="0" width="${size}" height="${size}">` +
    `<feImage x="0" y="0" width="${size}" height="${size}" result="map"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${baked.max.toFixed(2)}"` +
    ` xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter>`
  document.body.appendChild(svg)

  baked.canvas.toBlob((blob) => {
    if (!blob) return
    svg.querySelector('feImage').setAttribute('href', URL.createObjectURL(blob))
    document.documentElement.dataset.glass = 'on'
  })
  return true
}
