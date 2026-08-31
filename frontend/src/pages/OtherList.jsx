import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import MoreMenu from '../components/MoreMenu'
import { usePaginatedList } from '../hooks/usePaginatedList'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

// 안정적인 함수 참조(usePaginatedList의 dep) — 인라인 화살표면 매 렌더 새 참조가 되어 옵저버가 재생성됨.
const fetchOtherPage = (opts) => api.getRecordsPage({ ...opts, filter: 'other' })

export default function OtherList() {
  const navigate = useNavigate()
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(fetchOtherPage)

  const handleDelete = async (id) => {
    if (!window.confirm('삭제할까요?')) return
    await api.deleteOther(id)
    removeRecord(id)
  }

  return (
    <>
      <div className="topbar"><h1>기타 지출</h1></div>
      <div className="topbg"></div>
      <button className="btn-add" onClick={() => navigate('/other/new')}>+</button>
      <div className="content">
        {records.length === 0 && !hasMore
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
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    </>
  )
}
