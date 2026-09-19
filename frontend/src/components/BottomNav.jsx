import { useNavigate } from 'react-router-dom'

// 탭 링크는 전부 걷어냈다(홈·기록 통합, 설정은 요약 카드 우상단으로).
// 남은 건 하단 중앙의 기록 추가 버튼 하나뿐.
export default function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav className="bottom-nav">
      <button className="btn-add" aria-label="기록 추가" onClick={() => navigate('/records/new')}>+</button>
    </nav>
  )
}
