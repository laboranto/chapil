import { useState, useEffect } from 'react'
import { api } from '../api'
import { NavLink } from 'react-router-dom'

// fmt: 숫자를 천 단위 구분 형식으로 변환한다. (예: 50000 → "50,000")
const fmt = (n) => Number(n).toLocaleString('ko-KR')

export default function Home() {
  // data: API에서 불러온 대시보드 데이터. 초기값은 null(로딩 중).
  const [data, setData] = useState(null)

  // useEffect: 컴포넌트가 처음 화면에 나타날 때 한 번 실행된다.
  // 두 번째 인자 []는 "의존성 배열"로, 빈 배열이면 마운트 시 딱 한 번만 실행.
  useEffect(() => {
    api.getDashboard().then(setData)
  }, [])

  if (!data) return <div className="content"><div className="empty">비어있음</div></div>

  const last = data.recent_fuel[0] ?? null

  return (
    <>
      <div className="topbar">
        <h1>요약</h1>
        {/* 설정 페이지 바로가기 */}
        <NavLink to="/settings" className="setting-btn">
          설정
        </NavLink>
      </div>
      <div className="topbg"></div>
      <div className="content">

        {/* 요약 카드 2개 */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">총 지출</div>
            <div className="value">{fmt(data.total_cost)}<span className="unit">원</span></div>
          </div>
          <div className="summary-card">
            <div className="label">평균 연비</div>
            <div className="value">
              {data.avg_economy
                ? <>{data.avg_economy}<span className="unit">km/L</span></>
                : '-'}
            </div>
          </div>
        </div>

        {/* 마지막 주유 카드 */}
        {last && (
          <>
            <div className="section-header">마지막 주유</div>
            <div className="card">
              <div className="card-row">
                <div>
                  <div className="card-title">{last.date}</div>
                  <div className="card-sub">
                    {fmt(last.odometer)}km
                    {last.interval_km ? ` · +${last.interval_km}km` : ''}
                  </div>
                </div>
                <div className="card-amount">{fmt(last.amount)}원</div>
              </div>
              <div className="card-meta">
                {last.liters     && <span>{last.liters}L</span>}
                {last.unit_price && <span>@{fmt(last.unit_price)}원</span>}
                {last.fuel_economy && <span className="badge green">{last.fuel_economy}km/L</span>}
              </div>
            </div>
          </>
        )}

        {/* 최근 주유 내역 */}
        <div className="section-header">최근 주유 내역</div>
        {data.recent_fuel.length === 0
          ? <div className="empty">아직 주유 기록이 없어요</div>
          : data.recent_fuel.map(r => (
            <div className="card" key={r.id}>
              <div className="card-row">
                <div>
                  <div className="card-title">{r.date}</div>
                  <div className="card-sub">{fmt(r.odometer)}km{r.interval_km ? ` · +${r.interval_km}km` : ''}</div>
                </div>
                <div className="card-amount">{fmt(r.amount)}원</div>
              </div>
              {r.fuel_economy && (
                <div className="card-meta"><span className="badge green">{r.fuel_economy}km/L</span></div>
              )}
            </div>
          ))
        }
      </div>
    </>
  )
}
