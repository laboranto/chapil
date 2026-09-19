import { useNavigate } from 'react-router-dom'

// 하단 탭바를 대신한다. 링크는 전부 폐기됐고(홈·기록 통합, 설정은 요약 카드로)
// 남은 건 기록 추가 하나뿐이라 버튼만 정중앙에 띄운다.
export default function AddButton() {
  const navigate = useNavigate()
  return (
    <button className="btn-add" aria-label="기록 추가" onClick={() => navigate('/records/new')}>+</button>
  )
}
