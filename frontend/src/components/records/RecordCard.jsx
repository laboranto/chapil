import { Fragment } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { getRecordType } from './recordType'

const fmt = (n) => Number(n).toLocaleString('ko-KR')

// 상세 줄에 이어 붙일 조각들.
// 주유는 한 줄에 다섯 개가 들어가 과밀했다. 리터와 단가를 뺐다 — 연비 배지가
// 이미 "구간거리 / 리터"를 요약하고, 단가는 금액(윗줄)/리터로 나오는 값이다.
// 둘 다 수정 화면에 그대로 있다.
// ⚠️ 통합 목록(UNION)은 11개 컬럼만 내려준다(pagination.js 주석 참고).
//    type/location/category를 읽으면 전체 탭에서 조용히 undefined가 된다.
function detailsOf(r, economyUnit) {
  const out = []
  if (r.odometer) out.push(`${fmt(r.odometer)}km`)
  if (r.src === 'fuel') {
    if (r.interval_km) out.push(`+${r.interval_km}km`)
    const badOdometer = !r.odometer || r.odometer <= 0
    const suspiciousInterval = r.interval_km && r.odometer && r.interval_km >= r.odometer * 0.95
    if (badOdometer || suspiciousInterval) out.push(<span className="badge orange">주행거리 오류</span>)
    else if (r.fuel_economy && r.fuel_economy <= 50)
      out.push(<span className="badge green">{r.fuel_economy}&nbsp;{economyUnit}</span>)
  }
  if (r.memo) out.push(r.memo)
  return out
}

export default function RecordCard({ record: r, onOpen }) {
  const { options, settings, fuelTerm } = useSettings()
  const economyUnit = options.car_fuel.find(o => o.code === settings.car_fuel)?.economy_unit ?? 'km/L'

  // 주유는 이름 필드가 없어 종류 이름을 제목으로 쓴다. 덕분에 세 종류가
  // "제목 = 무엇을 했나"로 통일되고, 날짜는 월 헤더와 일 거터로 빠진다.
  const title = r.src === 'fuel' ? getRecordType('fuel', fuelTerm).label : r.item
  const details = detailsOf(r, economyUnit)

  return (
    <button type="button" className="record-row" onClick={onOpen}>
      <span className="record-day">{Number(r.date.slice(8, 10))}</span>
      <span className="record-title">{title}</span>
      <span className="record-amount">{r.amount ? `${fmt(r.amount)}원` : '-'}</span>
      <span className="record-detail">
        {details.map((d, i) => <Fragment key={i}>{i > 0 && ' · '}{d}</Fragment>)}
      </span>
    </button>
  )
}
