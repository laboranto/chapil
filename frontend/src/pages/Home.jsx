import { useState, useEffect } from 'react'
import { api } from '../api'
import { NavLink } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
// 버튼 아이콘(심볼) svg 이식
import SettingsIcon        from '../assets/symbols/gear.svg?react'
import HomeIcon        from '../assets/symbols/home.svg?react'
import FuelIcon        from '../assets/symbols/oil_and_electric.svg?react'
import MaintenanceIcon from '../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../assets/symbols/other.svg?react'

export default function Home() {
  // data: API에서 불러온 대시보드 데이터. 초기값은 null(로딩 중).
  const [data, setData] = useState(null)

// Settings.jsx에서 사용자가 입력한 차량 정보를 가져옴
const { settings, options } = useSettings()
const carTypeLabel = options.car_type.find(o => o.code === settings.car_type)?.label ?? ''
const fuelOption   = options.car_fuel.find(o => o.code === settings.car_fuel)
const carFuelLabel = fuelOption?.label        ?? ''
// 차량 특성에 따라 표현을 지정.
// '주유' 또는 '충전', 'km/L' 또는 'km/kWh', '연비' 또는 '전비'
const economyUnit  = fuelOption?.economy_unit  ?? 'km/L'
const economyLabel = fuelOption?.economy_label ?? '연비'
const { fuelTerm } = useSettings()

  // useEffect: 컴포넌트가 처음 화면에 나타날 때 한 번 실행된다.
  // 두 번째 인자 []는 "의존성 배열"로, 빈 배열이면 마운트 시 딱 한 번만 실행.
  useEffect(() => {
    api.getDashboard().then(setData)
  }, [])

  if (!data) return (
    <>
        <div className="topbar">
        <h1>환영합니다</h1>
        {/* 설정 페이지 바로가기 */}
        <NavLink to="/settings" className="setting-btn">
          <SettingsIcon/>
        </NavLink>
      </div>
      <div className="topbg"></div>

  <div className="content"><div className="empty">아직 데이터가 없습니다</div></div>
    </>
  )


  const last = data.recent_fuel[0] ?? null
  const latestOdometer = data.latest_odometer ?? '-'

  // fmt: 숫자를 천 단위 구분 형식으로 변환한다. (예: 50000 → "50,000")
const fmt = (n) => Number(n).toLocaleString('ko-KR')

  return (
    <>
    {/*** 상단 타이틀 바 ***/}
      <div className="topbar">
        <h1>환영합니다</h1>
        {/* 설정 페이지 바로가기 */}
        <NavLink to="/settings" className="setting-btn">
          <SettingsIcon/>
        </NavLink>
      </div>
      <div className="topbg"></div>

    {/*----- 본문 -----*/}
      <div className="content">
    {/*** 차량 프로필 ***/}
      <div className="car-profile">
        <h1>{settings.car_plate}</h1>
        <div className="car-model">
        <h5>{settings.car_brand}&nbsp;{settings.car_model}・{settings.car_birth?.slice(0,4)}</h5>
        <p>{carTypeLabel}・{carFuelLabel}</p>
        </div>
        <div className="car-summary">
        <h3>
          <span>한 달 동안</span>&nbsp;{fmt(data.cost_last_30d ?? 0)}원&nbsp;<span>지출</span>
        </h3>
        <h3>
        <span>평균 {economyLabel}</span>&nbsp;
        {data.avg_economy
                ? <>{data.avg_economy}</>
                : '-'}
                &nbsp;<span>{economyUnit}</span>
        </h3>
        <h3>
          <span>총 주행거리</span>&nbsp;
        {data.latest_odometer
        ? fmt(data.latest_odometer)
        : '-'}
          &nbsp;<span>km</span>
        </h3>
        </div>
      </div>

        {/* 마지막 기록(주유(충전)-정비-기타) 카드 */}
        {/* 주유 */}
        {last && (
          <>
            <div className="section-header">최근 기록</div>
            <div className="card">
              <div className="card-row">
                <div className="card-icon">
                <FuelIcon />
                <h5>{fuelTerm}</h5>
                </div>
                <div className="card-content">
                  <div className="card-title">
                    {last.date}
                    </div>
                  <div className="card-sub">
                    {fmt(last.odometer)}km
                    {last.interval_km ? ` · +${last.interval_km}km` : ''}
                  <div className="card-meta">
                  {last.liters     && <span>{last.liters}L</span>}
                  {last.unit_price && <span>@{fmt(last.unit_price)}원</span>}
                  </div>
                  </div>
                </div>
                <div className="card-amount">{fmt(last.amount)}원</div>
              </div>
            </div>
          </>
        )}
        {/* 정비 */}
        {data.last_maintenance && (
          <div className="card">
            <div className="card-row">
                <div className="card-icon">
                <MaintenanceIcon />
                <h5>정비</h5>
                </div>
              <div className="card-content">
                <div className="card-title">
                  {data.last_maintenance.date}</div>
                <div className="card-sub">
                  {data.last_maintenance.odometer ? `${fmt(data.last_maintenance.odometer)}km · `: ' '}
                  {data.last_maintenance.item}
                  </div>
            </div>
          <div className="card-amount">{data.last_maintenance.amount ? `${fmt(data.last_maintenance.amount)}원` : '-'}</div>
          </div>
          </div>
        )}
        {/* 기타 */}
        {data.last_other && (
          <div className="card">
            <div className="card-row">
              <div className="card-icon">
                <OtherIcon />
                <h5>기타</h5>
              </div>
              <div>
                <div className="card-title">
                  {data.last_other.date}</div>
                <div className="card-sub">
                  {data.last_other.odometer ? `${fmt(data.last_other.odometer)}km · `: ' '}
                  {data.last_other.item}
                  </div>
              </div>
          <div className="card-amount">{data.last_other.amount ? `${fmt(data.last_other.amount)}원` : '-'}</div>
          </div>
            {data.last_other.memo && <div className="card-meta"><span>{data.last_other.memo}</span></div>}
          </div>
        )}

      <div className="section-footer">
        오늘도 안전운전 하세요
        <p>차필(chapil) 2026 | v26.04.28a</p>
      </div>

      </div>
    </>
  )
}
