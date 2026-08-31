import MoreMenu from '../MoreMenu'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function MaintenanceCard({ record: r, onEdit, onDelete }) {
  return (
    <div className="card">
      <div className="card-row">
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
