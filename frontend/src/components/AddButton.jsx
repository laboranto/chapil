import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sheetState } from '../sheet'
import { installGlassRefraction } from '../glassRefraction'

// 하단 탭바를 대신한다. 링크는 전부 폐기됐고(홈·기록 통합, 설정은 요약 카드로)
// 남은 건 기록 추가 하나뿐이라 버튼만 정중앙에 띄운다.
export default function AddButton() {
  const navigate = useNavigate()
  const location = useLocation()
  // 굴절 필터는 이 버튼 크기에 맞춰 굽는다. 지원 안 하면 조용히 빠지고
  // index.css의 림·스페큘러 층만 남는다(html에 data-glass가 안 붙는다).
  useEffect(() => { installGlassRefraction({ size: 56, bezel: 12, thickness: 14 }) }, [])
  return (
    <button className="btn-add" aria-label="기록 추가" onClick={() => navigate('/records/new', { state: sheetState(location) })}>+</button>
  )
}
