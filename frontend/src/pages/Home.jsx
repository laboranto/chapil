import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import { NavLink } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import Cropper from 'react-easy-crop'
// 버튼 아이콘(심볼) svg 이식
import SettingsIcon        from '../assets/symbols/gear.svg?react'
import HomeIcon        from '../assets/symbols/home.svg?react'
import FuelIcon        from '../assets/symbols/oil_and_electric.svg?react'
import MaintenanceIcon from '../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../assets/symbols/other.svg?react'
import ProfileIcon     from '../assets/defaults/profile.svg?react'

async function getCroppedBlob(imageSrc, pixelCrop) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = pixelCrop.width
      canvas.height = pixelCrop.height
      canvas.getContext('2d').drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      )
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    }
    image.src = imageSrc
  })
}

export default function Home() {
  // data: API에서 불러온 대시보드 데이터. 초기값은 null(로딩 중).
  const [data, setData] = useState(null)

  const [imgTs, setImgTs] = useState(() => Date.now())
  const [imgError, setImgError] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const imgInputRef = useRef(null)

  const [cropSrc, setCropSrc] = useState(null)
  const [cropMode, setCropMode] = useState('upload') // 'upload' | 'edit'
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])
  const originalFileRef = useRef(null)

  const openCrop = (src, mode) => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropMode(mode)
    setCropSrc(src)
    setModalOpen(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    originalFileRef.current = file
    openCrop(URL.createObjectURL(file), 'upload')
  }

  const handleEdit = async () => {
    const originalUrl = api.carImageOriginalUrl(Date.now())
    const res = await fetch(originalUrl, { method: 'HEAD' })
    openCrop(res.ok ? originalUrl : api.carImageUrl(imgTs), 'edit')
  }

  const handleCropConfirm = async () => {
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      const croppedFile = new File([blob], 'car_image.jpg', { type: 'image/jpeg' })
      if (cropMode === 'upload') {
        await api.uploadCarImageOriginal(originalFileRef.current)
        originalFileRef.current = null
      }
      await api.uploadCarImage(croppedFile)
      setImgTs(Date.now())
      setImgError(false)
      if (cropMode === 'upload') URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    } catch (err) {
      alert(`업로드 실패: ${err.message}`)
    }
  }

  const handleCropCancel = () => {
    if (cropMode === 'upload') URL.revokeObjectURL(cropSrc)
    originalFileRef.current = null
    setCropSrc(null)
  }

  const handleDelete = async () => {
    try {
      await api.deleteCarImage()
      setImgTs(Date.now())
      setImgError(true)
      setModalOpen(false)
    } catch (err) {
      alert(`삭제 실패: ${err.message}`)
    }
  }

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

  // fmt: 숫자를 천 단위 구분 형식으로 변환한다. (예: 50000 → "50,000")
  const fmt = (n) => Number(n).toLocaleString('ko-KR')

  const carThumb = (
    <button className="car-thumb-btn" onClick={() => setModalOpen(true)}>
      {imgError && <ProfileIcon className="car-thumb" />}
      <img
        className="car-thumb"
        src={api.carImageUrl(imgTs)}
        onLoad={() => setImgError(false)}
        onError={() => setImgError(true)}
        alt=""
        style={{ display: imgError ? 'none' : 'block' }}
      />
    </button>
  )

  const carImageModal = modalOpen && (
    <div className="car-modal-overlay" onClick={() => setModalOpen(false)}>
      <div className="car-modal" onClick={e => e.stopPropagation()}>
        <div className="car-modal-img">
          {!imgError
            ? <img src={api.carImageUrl(imgTs)} alt="차량 사진" />
            : <ProfileIcon />
          }
        </div>
        <div className="car-modal-btns">
          <button onClick={handleDelete}>삭제</button>
          <button onClick={handleEdit} disabled={imgError}>편집</button>
          <button onClick={() => imgInputRef.current?.click()}>업로드</button>
        </div>
      </div>
    </div>
  )

  const cropModal = cropSrc && (
    <div className="crop-overlay">
      <div className="crop-container">
        <Cropper
          image={cropSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="crop-controls">
        <button className="crop-btn" onClick={handleCropCancel}>취소</button>
        <button className="crop-btn crop-btn-confirm" onClick={handleCropConfirm}>확인</button>
      </div>
    </div>
  )

  if (!data) return (
    <>
      <div className="topbar topbar-home">
        {carThumb}
        <h1>환영합니다</h1>
        <NavLink to="/settings" className="setting-btn">
          <SettingsIcon/>
        </NavLink>
      </div>
      <div className="topbg"></div>
      <div className="content"><div className="empty">아직 데이터가 없습니다</div></div>
      {carImageModal}
      <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      {cropModal}
    </>
  )

  const last = data.recent_fuel[0] ?? null

  return (
    <>
    {/*** 상단 타이틀 바 ***/}
      <div className="topbar topbar-home">
        {carThumb}
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
        {settings.Car_plate
        ? <h1>{settings.car_plate}</h1>
        : ''}
        <div className="car-model">
        <h5>
          {settings.car_brand} {settings.car_model}
          {settings.car_model && settings.car_birth ? '・' : ''}
          {settings.car_birth?.slice(0, 4)}
        </h5>
        <p>
          {carTypeLabel}
          {carTypeLabel && carFuelLabel ? '・':''}
          {carFuelLabel}
        </p>
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
        <p>차필(chapil) 2026 | v26.5.3a</p>
      </div>

      </div>
      {carImageModal}
      <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      {cropModal}
    </>
  )
}
