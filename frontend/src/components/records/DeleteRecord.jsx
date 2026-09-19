import { useNavigate } from 'react-router-dom'

// 목록의 '...' 메뉴를 걷어내면서 삭제가 갈 곳이 없어졌다. 수정 화면 하단으로 옮긴다.
export default function DeleteRecord({ onDelete }) {
  const navigate = useNavigate()
  const handle = async () => {
    if (!window.confirm('삭제할까요?')) return
    await onDelete()
    navigate('/')
  }
  return (
    <div className="record-delete">
      <button type="button" className="btn btn-danger" onClick={handle}>삭제</button>
    </div>
  )
}
