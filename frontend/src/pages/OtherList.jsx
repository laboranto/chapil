import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function OtherList() {
  const [records, setRecords] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.getOther().then(setRecords)
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteOther(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      <div className="topbar"><h1>기타 지출</h1></div>
      <div className="topbg"></div>
      <button className="btn-add" onClick={() => navigate('/other/new')}>+</button>
      <div className="content">
        {records.length === 0
          ? <div className="empty">기타 지출 기록이 없어요</div>
          : records.map(r => (
            <div className="card" key={r.id}>
              <div className="card-row">
                <div>
                  <div className="card-title">{r.item}</div>
                  <div className="card-sub">
                    {r.date}{r.odometer ? ` · ${fmt(r.odometer)}km` : ''}
                  </div>
                </div>
                <div className="card-amount">
                  {r.amount ? `${fmt(r.amount)}원` : '-'}
                  <MoreMenu
                    onEdit={() => navigate(`/other/${r.id}/edit`)}
                    onDelete={() => handleDelete(r.id)}
                  />
                </div>
              </div>
              {r.memo && <div className="card-meta"><span>{r.memo}</span></div>}
            </div>
          ))
        }
      </div>
    </>
  )
}
