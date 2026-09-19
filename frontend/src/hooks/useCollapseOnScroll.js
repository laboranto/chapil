import { useState, useEffect, useRef } from 'react'

// 상단 고정 헤더의 축약 토글.
// sentinelRef를 헤더보다 DOM 앞(문서 최상단)에 달면, 그것이 화면에서 벗어날 때 true.
// 헤더가 줄어도 그보다 위에 있는 sentinel의 위치는 변하지 않으므로 경계에서 진동하지 않는다.
export function useCollapseOnScroll() {
  const [collapsed, setCollapsed] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const ob = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting))
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return { collapsed, sentinelRef }
}
