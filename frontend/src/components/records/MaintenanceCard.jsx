import MoreMenu from '../MoreMenu'
import { getRecordType } from './recordType'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function MaintenanceCard({ record: r, showTypeIcon = false, onEdit, onDelete }) {
  const { Icon } = getRecordType('maintenance')
  return (
    <div className="card">
      <div className="card-row">
        {showTypeIcon && <div className="card-icon"><Icon /></div>}
        <div>
          <div className="card-title">{r.item}</div>
          <div className="card-sub">{r.date} · {fmt(r.odometer)}km</div>
        </div>
        <div className="card-amount">
          {r.amount ? `${fmt(r.amount)}원` : '-'}
          {(onEdit || onDelete) && <MoreMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>
      {r.memo && <div className="card-meta"><span>{r.memo}</span></div>}
    </div>
  )
}
