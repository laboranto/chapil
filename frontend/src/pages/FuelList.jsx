import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function FuelList() {
  const [records, setRecords] = useState([])
  // useNavigate: 코드에서 페이지를 이동시키는 함수를 반환한다.
  const navigate = useNavigate()

  useEffect(() => {
    api.getFuel().then(setRecords)
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteFuel(id)
    // 삭제된 항목을 제외하고 상태를 갱신한다. (API 재호출 없이)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      <div className="topbar"><h1>주유 기록</h1></div>
      <div className="topbg"></div>
      <button className="btn-add" onClick={() => navigate('/fuel/new')}>+</button>
      <div className="content">
        {records.length === 0
          ? <div className="empty">주유 기록이 없어요</div>
          : records.map(r => (
            <div className="card" key={r.id}>
              <div className="card-row">
                <div>
                  <div className="card-title">{r.date}</div>
                  <div className="card-sub">{fmt(r.odometer)}km{r.interval_km ? ` · +${r.interval_km}km` : ''}</div>
                </div>
                <div className="card-amount">{fmt(r.amount)}원</div>
              </div>
              <div className="card-meta">
                {r.liters      && <span>{r.liters}L</span>}
                {r.unit_price  && <span>@{fmt(r.unit_price)}원/L</span>}
                {r.fuel_economy && <span className="badge green">{r.fuel_economy}km/L</span>}
                {r.memo        && <span>{r.memo}</span>}
              </div>
              <div className="card-actions">
                <button className="btn-sm btn-edit" onClick={() => navigate(`/fuel/${r.id}/edit`)}>수정</button>
                <button className="btn-sm btn-del"  onClick={() => handleDelete(r.id)}>삭제</button>
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}
