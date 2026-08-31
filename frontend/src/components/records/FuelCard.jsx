import MoreMenu from '../MoreMenu'
import { useSettings } from '../../context/SettingsContext'
import { getRecordType } from './recordType'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function FuelCard({ record: r, showTypeIcon = false, onEdit, onDelete }) {
  const { options, settings, fuelTerm } = useSettings()
  const economyUnit = options.car_fuel.find(o => o.code === settings.car_fuel)?.economy_unit ?? 'km/L'
  const { Icon } = getRecordType('fuel', fuelTerm)

  const badOdometer = !r.odometer || r.odometer <= 0
  const suspiciousInterval = r.interval_km && r.odometer && r.interval_km >= r.odometer * 0.95
  const hasDataIssue = badOdometer || suspiciousInterval
  const showEconomy = r.fuel_economy && !hasDataIssue && r.fuel_economy <= 50

  return (
    <div className="card">
      <div className="card-row">
        {showTypeIcon && <div className="card-icon"><Icon /></div>}
        <div>
          <div className="card-title">{r.date}</div>
          <div className="card-sub">
            {fmt(r.odometer)}km{r.interval_km ? ` · +${r.interval_km}km` : ''}
            {hasDataIssue && <>&nbsp;<span className="badge orange">주행거리 오류</span></>}
          </div>
        </div>
        <div className="card-amount">
          {fmt(r.amount)}원
          {(onEdit || onDelete) && <MoreMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>
      <div className="card-meta">
        {r.liters      && <span>{parseFloat(r.liters).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}L</span>}
        {r.unit_price  && <span>@{fmt(r.unit_price)}원/L</span>}
        {showEconomy   && <span className="badge green">{r.fuel_economy}&nbsp;{economyUnit}</span>}
        {r.memo        && <span>{r.memo}</span>}
      </div>
    </div>
  )
}
