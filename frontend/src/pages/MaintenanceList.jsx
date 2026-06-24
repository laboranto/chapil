import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { usePaginatedList } from '../hooks/usePaginatedList'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function MaintenanceList() {
  const navigate = useNavigate()
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(api.getMaintenancePage)

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteMaintenance(id)
    removeRecord(id)
  }

  return (
    <>
      <div className="topbar"><h1>정비 기록</h1></div>
      <div className="topbg"></div>
      <button className="btn-add" onClick={() => navigate('/maintenance/new')}>+</button>
      <div className="content">
        {records.length === 0 && !hasMore
          ? <div className="empty">정비 기록이 없어요</div>
          : records.map(r => (
            <div className="card" key={r.id}>
              <div className="card-row">
                <div>
                  <div className="card-title">{r.item}</div>
                  <div className="card-sub">{r.date} · {fmt(r.odometer)}km</div>
                </div>
                <div className="card-amount">
                  {r.amount ? `${fmt(r.amount)}원` : '-'}
                  <MoreMenu
                    onEdit={() => navigate(`/maintenance/${r.id}/edit`)}
                    onDelete={() => handleDelete(r.id)}
                  />
                </div>
              </div>
              {r.memo && <div className="card-meta"><span>{r.memo}</span></div>}
            </div>
          ))
        }
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    </>
  )
}
