import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { useSettings } from '../context/SettingsContext'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function FuelList() {
  const [records, setRecords] = useState([])
  const navigate = useNavigate()
  const { options, settings } = useSettings()
  const economyUnit = options.car_fuel.find(o => o.code === settings.car_fuel)?.economy_unit ?? 'km/L'

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
                <div className="card-amount">
                  {fmt(r.amount)}원
                  <MoreMenu
                    onEdit={() => navigate(`/fuel/${r.id}/edit`)}
                    onDelete={() => handleDelete(r.id)}
                  />
                </div>
              </div>
              <div className="card-meta">
                {r.liters      && <span>{parseFloat(r.liters).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}L</span>}
                {r.unit_price  && <span>@{fmt(r.unit_price)}원/L</span>}
                {r.fuel_economy && <span className="badge green">{r.fuel_economy}&nbsp;{economyUnit}</span>}
                {r.memo        && <span>{r.memo}</span>}
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}
