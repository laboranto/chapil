// 축약된 요약 헤더 아래 모서리의 굴절을 SVG 변위 맵으로 만들어
// backdrop-filter에 물린다. 방법은 kube.io/blog/liquid-glass-css-svg 를 따랐다.
//
// Liquid Glass는 블러가 아니라 굴절이다. 블러만 씌운 건 Aqua·Aero 시절의 옛
// 글래스모피즘이고, 애플이 한 단계 올린 지점이 실시간 굴절이다.
//
// 지금 이게 도는 곳은 Chrome/Edge뿐이다 — SVG 필터를 backdrop-filter로 쓰는 건
// WebKit Bug 245510으로 막혀 있고(PR #68614 대기), Firefox도 미지원이다.
// 못 쓰면 아무것도 안 하고 조용히 빠진다.
//
// 그리고 솔직히, 지금 화면에서는 켜져도 눈에 안 띈다. 글자 가독성 때문에
// 블러를 못 빼는데 그게 변위를 뭉개고, 배경이 흰 목록이라 굴절시킬 대비가
// 애초에 없다(실측: blur 20→4px, scale 14→30으로 흔들어도 차이가 0.8% 픽셀).
// 사진처럼 대비 큰 배경 위에서만 값을 한다. 같은 이유로 기록 추가 버튼에서는
// 걷어냈다 — 거기선 알파를 내려야 보이는데 그러면 대비가 3:1 아래로 떨어진다.
// 남겨두는 건 WebKit이 열리거나 유리 뒤에 사진이 올 때를 위해서다.

const BAR_ID = 'chapil-glass-bar'
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

// 공통 껍데기: 변위 맵을 물린 SVG 필터를 만들어 붙인다.
function mountFilter(id, w, h, scale) {
  let svg = document.getElementById(`${id}-svg`)
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = `${id}-svg`
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0')
    svg.style.cssText = 'position:absolute;pointer-events:none'
    document.body.appendChild(svg)
  }
  svg.innerHTML =
    `<filter id="${id}" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"` +
    ` x="0" y="0" width="${w}" height="${h}">` +
    `<feImage x="0" y="0" width="${w}" height="${h}" result="map"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale.toFixed(2)}"` +
    ` xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter>`
  return svg
}

// 아래 모서리에만 베젤이 있는 띠. 내비 바처럼 목록이 밑으로 흘러드는
// 경계에서만 휘어야 하므로 좌우·위는 건드리지 않는다(화면 가장자리라
// 거기까지 휘면 어색하다). y로만 변하므로 한 행만 계산해 가로로 늘린다.
function bakeBottomEdge(w, h, bezel, thickness) {
  const steps = 128
  const mags = Array.from({ length: steps }, (_, i) => displacement(i / (steps - 1), bezel, thickness))
  const max = Math.max(...mags)
  if (!(max > 0)) return null

  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    const fromEdge = h - (y + 0.5)
    let ny = 0
    if (fromEdge >= 0 && fromEdge < bezel) {
      const u = fromEdge / bezel
      // 볼록 베젤은 바깥(아래) 배경을 위로 끌어온다 — 아래에서 샘플한다.
      ny = mags[Math.min(steps - 1, Math.round(u * (steps - 1)))] / max
    }
    const g = Math.round(128 + ny * 127)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      img.data[o] = 128; img.data[o + 1] = g; img.data[o + 2] = 128; img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { canvas: cv, max }
}

// 축약된 요약 헤더용. 폭이 뷰포트를 타므로 크기가 바뀔 때마다 다시 굽는다.
// backdrop-filter는 요소 크기에 자동으로 안 맞춰진다(kube.io의 주의사항).
export function installBarRefraction(el, { bezel = 14, thickness = 16 } = {}) {
  if (typeof CSS === 'undefined' || !CSS.supports('backdrop-filter', 'url(#x)')) return () => {}

  let lastW = 0, lastH = 0, url = null
  const rebake = () => {
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight)
    if (!w || !h || (w === lastW && h === lastH)) return
    lastW = w; lastH = h
    const baked = bakeBottomEdge(w, h, bezel, thickness)
    if (!baked) return
    const svg = mountFilter(BAR_ID, w, h, baked.max)
    baked.canvas.toBlob((blob) => {
      if (!blob) return
      if (url) URL.revokeObjectURL(url)
      url = URL.createObjectURL(blob)
      svg.querySelector('feImage').setAttribute('href', url)
      document.documentElement.dataset.glassBar = 'on'
    })
  }

  const ro = new ResizeObserver(rebake)
  ro.observe(el)
  rebake()
  return () => {
    ro.disconnect()
    if (url) URL.revokeObjectURL(url)
    delete document.documentElement.dataset.glassBar
  }
}
