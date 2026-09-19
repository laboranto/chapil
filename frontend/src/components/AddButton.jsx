import { useNavigate, useLocation } from 'react-router-dom'
import { sheetState } from '../sheet'

// 하단 탭바를 대신한다. 링크는 전부 폐기됐고(홈·기록 통합, 설정은 요약 카드로)
// 남은 건 기록 추가 하나뿐이라 버튼만 정중앙에 띄운다.
export default function AddButton() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <button className="btn-add" aria-label="기록 추가" onClick={() => navigate('/records/new', { state: sheetState(location) })}>+</button>
  )
}
