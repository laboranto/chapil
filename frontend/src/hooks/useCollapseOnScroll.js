import { useState, useEffect, useRef } from 'react'

// 상단 고정 헤더의 축약 토글.
// sentinelRef를 헤더보다 DOM 앞(문서 최상단)에 달면, 그것이 화면에서 벗어날 때 true.
// 헤더가 줄어도 그보다 위에 있는 sentinel의 위치는 변하지 않으므로 반복 진동은 없다.
// 다만 기록이 한두 건뿐이면 헤더가 줄어든 만큼 문서가 짧아져 스크롤이 0으로 당겨지고,
// 그 바람에 한 번 다시 펼쳐진다 — 거기서 정착하므로 그대로 둔다.
export function useCollapseOnScroll() {
  const [collapsed, setCollapsed] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const ob = new IntersectionObserver(es => setCollapsed(!es.at(-1).isIntersecting))
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return { collapsed, sentinelRef }
}
