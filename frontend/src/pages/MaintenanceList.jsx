import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function MaintenanceList() {
  const [records, setRecords] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.getMaintenance().then(setRecords)
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteMaintenance(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      <div className="topbar"><h1>정비 기록</h1></div>
      <div className="topbg"></div>
      <button className="btn-add" onClick={() => navigate('/maintenance/new')}>+</button>
      <div className="content">
        {records.length === 0
          ? <div className="empty">정비 기록이 없어요</div>
          : records.map(r => (
            <div className="card" key={r.id}>
              <div className="card-row">
                <div>
                  <div className="card-title">{r.item}</div>
                  <div className="card-sub">{r.date} · {fmt(r.odometer)}km</div>
                </div>
                <div className="card-amount">{r.amount ? `${fmt(r.amount)}원` : '-'}</div>
              </div>
              {r.memo && <div className="card-meta"><span>{r.memo}</span></div>}
              <div className="card-actions">
                <button className="btn-sm btn-edit" onClick={() => navigate(`/maintenance/${r.id}/edit`)}>수정</button>
                <button className="btn-sm btn-del"  onClick={() => handleDelete(r.id)}>삭제</button>
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}
