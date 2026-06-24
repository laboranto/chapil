import { useState, useEffect, useRef, useCallback } from 'react'

// 무한 스크롤 목록 공통 훅.
// fetchPage: async ({ cursor }) => ({ rows, nextCursor })
// - 마운트 시 첫 페이지 로드.
// - sentinelRef를 목록 끝 요소에 달면, 그 요소가 화면에 들어올 때 다음 페이지를 이어 붙인다.
export function usePaginatedList(fetchPage) {
  const [records, setRecords] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef(null)

  // 비동기 호출 사이에서 즉시 읽혀야 하는 값은 ref로 관리(중복 호출 방지).
  const cursorRef = useRef(null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const didInit = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const { rows, nextCursor } = await fetchPage({ cursor: cursorRef.current })
      cursorRef.current = nextCursor
      hasMoreRef.current = nextCursor !== null
      setRecords(prev => [...prev, ...rows])
      setHasMore(hasMoreRef.current)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [fetchPage])

  const removeRecord = useCallback((id) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  // 마운트 시 첫 페이지 1회 로드 (StrictMode 이중 실행 방지: didInit 가드)
  // StrictMode의 개발 모드 이중 호출에서는 가드로 중복 방지; 실제 언마운트/리마운트 시 React가 새 컴포넌트 인스턴스를 생성하므로 didInit은 자동 리셋됨.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    loadMore()
  }, [loadMore])

  // sentinel이 보이면 다음 페이지 로드.
  // 첫 50개가 화면을 못 채우면 sentinel이 즉시 보여 연쇄 로드된다(뷰포트가 차거나 데이터 소진까지) — 정상 동작.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    })
    ob.observe(el)
    return () => ob.disconnect()
  }, [loadMore, hasMore])

  return { records, hasMore, loading, sentinelRef, removeRecord }
}
