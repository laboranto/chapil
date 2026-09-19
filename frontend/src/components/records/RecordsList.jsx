import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import FuelCard from './FuelCard'
import MaintenanceCard from './MaintenanceCard'
import OtherCard from './OtherCard'

const CARD = { fuel: FuelCard, maintenance: MaintenanceCard, other: OtherCard }
const EDIT_PATH = {
  fuel: (id) => `/records/fuel/${id}/edit`,
  maintenance: (id) => `/records/maintenance/${id}/edit`,
  other: (id) => `/records/other/${id}/edit`,
}
const DELETE_API = { fuel: api.deleteFuel, maintenance: api.deleteMaintenance, other: api.deleteOther }

export default function RecordsList({ filter, onMutate }) {
  const navigate = useNavigate()
  const fetchPage = useCallback(
    ({ cursor }) => api.getRecordsPage({ cursor, filter }),
    [filter]
  )
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(fetchPage)

  const handleDelete = async (src, id) => {
    if (!window.confirm('삭제할까요?')) return
    await DELETE_API[src](id)
    removeRecord(id, src)
    onMutate?.()   // 추가·수정은 홈이 리마운트되며 요약을 다시 읽지만, 삭제는 제자리라 직접 알려야 한다
  }

  if (records.length === 0 && !hasMore)
    return <div className="empty">기록이 없어요</div>

  return (
    <>
      {records.map(r => {
        const Card = CARD[r.src]
        return (
          <Card
            key={`${r.src}-${r.id}`}
            record={r}
            onEdit={() => navigate(EDIT_PATH[r.src](r.id))}
            onDelete={() => handleDelete(r.src, r.id)}
          />
        )
      })}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </>
  )
}
