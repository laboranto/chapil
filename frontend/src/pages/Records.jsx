import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import SegmentTabs from '../components/SegmentTabs'
import FuelCard from '../components/records/FuelCard'
import MaintenanceCard from '../components/records/MaintenanceCard'
import OtherCard from '../components/records/OtherCard'
import FuelIcon        from '../assets/symbols/fuel.svg?react'
import ChargeIcon      from '../assets/symbols/charge.svg?react'
import MaintenanceIcon from '../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../assets/symbols/other.svg?react'

const CARD = { fuel: FuelCard, maintenance: MaintenanceCard, other: OtherCard }
const EDIT_PATH = {
  fuel: (id) => `/records/fuel/${id}/edit`,
  maintenance: (id) => `/records/maintenance/${id}/edit`,
  other: (id) => `/records/other/${id}/edit`,
}
const DELETE_API = { fuel: api.deleteFuel, maintenance: api.deleteMaintenance, other: api.deleteOther }

function RecordsList({ filter }) {
  const navigate = useNavigate()
  const fetchPage = useCallback(
    ({ cursor }) => api.getRecordsPage({ cursor, filter }),
    [filter]
  )
  const { records, hasMore, sentinelRef, removeRecord } = usePaginatedList(fetchPage)

  const handleDelete = async (src, id) => {
    if (!window.confirm('삭제할까요?')) return
    await DELETE_API[src](id)
    removeRecord(id)
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
            showTypeIcon
            onEdit={() => navigate(EDIT_PATH[r.src](r.id))}
            onDelete={() => handleDelete(r.src, r.id)}
          />
        )
      })}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </>
  )
}

export default function Records() {
  const navigate = useNavigate()
  const { fuelTerm } = useSettings()
  const [filter, setFilter] = useState(null)

  const options = [
    { key: 'fuel', label: fuelTerm, Icon: fuelTerm === '충전' ? ChargeIcon : FuelIcon },
    { key: 'maintenance', label: '정비', Icon: MaintenanceIcon },
    { key: 'other', label: '기타', Icon: OtherIcon },
  ]

  return (
    <>
      <button className="btn-add" onClick={() => navigate('/records/new')}>+</button>
      <div className="content no-topbar">
        <SegmentTabs
          className="records-tabs"
          options={options}
          value={filter}
          onChange={setFilter}
          allowDeselect
        />
        <RecordsList key={filter ?? 'all'} filter={filter} />
      </div>
    </>
  )
}
