import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { sheetState } from '../sheet'
import { subscribe, getRevision } from '../recordsRevision'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
import { useCollapseOnScroll } from '../hooks/useCollapseOnScroll'
import Cropper from 'react-easy-crop'
import CarIcon from '../assets/symbols/car.svg?react'
import SettingsIcon from '../assets/symbols/settings.svg?react'
import SegmentTabs from '../components/SegmentTabs'
import RecordsList from '../components/records/RecordsList'
import { getRecordType } from '../components/records/recordType'

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
  const [uploading, setUploading] = useState(false)

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
    const originalUrl = api.carImageOriginalUrl()
    openCrop(originalUrl ?? api.carImageUrl(), 'edit')
  }

  const handleCropConfirm = async () => {
    setUploading(true)
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
    } finally {
      setUploading(false)
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
const { settings, options, fuelTerm } = useSettings()
const carTypeLabel = options.car_type.find(o => o.code === settings.car_type)?.label ?? ''
const fuelOption   = options.car_fuel.find(o => o.code === settings.car_fuel)
const carFuelLabel = fuelOption?.label        ?? ''
// 차량 특성에 따라 표현을 지정.
// '주유' 또는 '충전', 'km/L' 또는 'km/kWh', '연비' 또는 '전비'
const economyUnit  = fuelOption?.economy_unit  ?? 'km/L'
const economyLabel = fuelOption?.economy_label ?? '연비'

  const location = useLocation()
  const [filter, setFilter] = useState(null)
  const { collapsed, sentinelRef } = useCollapseOnScroll()
  const tabOptions = ['fuel', 'maintenance', 'other'].map(key => ({ key, ...getRecordType(key, fuelTerm) }))

  // 시트로 띄운 양식에서 기록을 바꾸면 홈은 마운트된 채라 스스로는 모른다.
  // revision이 올라갈 때마다 요약을 다시 읽고 목록을 새 key로 갈아 끼운다.
  //
  // ponytail: key를 바꾸면 목록이 리마운트돼 1페이지부터 다시 받는다. 2페이지
  // 넘게 펼쳐둔 상태에서 저장하면 스크롤이 한 번 튄다(측정: 4157 → 2999).
  // 양식이 전체 페이지였을 땐 무조건 맨 위로 갔으니 퇴보는 아니다. 행만
  // 갈아끼우려면 생성·수정·삭제 배선을 셋으로 쪼개야 해서 v1에서는 안 한다.
  const revision = useSyncExternalStore(subscribe, getRevision)
  useEffect(() => { api.getDashboard().then(setData) }, [revision])

  // fmt: 숫자를 천 단위 구분 형식으로 변환한다. (예: 50000 → "50,000")
  const fmt = (n) => Number(n).toLocaleString('ko-KR')

  const carThumb = (
    <button className="car-thumb-btn" onClick={() => setModalOpen(true)}>
      {imgError && <CarIcon className="car-thumb" />}
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
            : <CarIcon />
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
        {uploading
          ? <span className="crop-uploading">잠시만 기다려주세요...</span>
          : <>
              <button className="crop-btn" onClick={handleCropCancel}>취소</button>
              <button className="crop-btn crop-btn-confirm" onClick={handleCropConfirm}>확인</button>
            </>
        }
      </div>
    </div>
  )

  const identityBlock = (
    <div className="identity-block">
      {carThumb}
      <div className="identity-text">
        <div className="identity-name">{settings.car_brand} {settings.car_model}</div>
        <div className="identity-spec">
          {[settings.car_plate, settings.car_birth?.slice(0, 4), carTypeLabel, carFuelLabel].filter(Boolean).join(' · ')}
        </div>
      </div>
      <Link to="/settings" state={sheetState(location)} className="settings-btn" aria-label="설정"><SettingsIcon /></Link>
    </div>
  )

  return (
    <>
      <div className="content main-page">
        {/* 헤더보다 앞(위)에 있어야 헤더가 줄어도 안 밀린다. 높이 40px = 축약 시작 지점 */}
        <div ref={sentinelRef} className="collapse-sentinel" />

        <header className={'summary-header' + (collapsed ? ' collapsed' : '')}>
          {identityBlock}
          <div className="summary-tiles">
            <div className="summary-tile"><span>한 달 지출</span><span><b>{data ? fmt(data.cost_last_30d ?? 0) : '-'}</b> 원</span></div>
            <div className="summary-tile"><span>평균 {economyLabel}</span><span><b>{data?.avg_economy ?? '-'}</b> {economyUnit}</span></div>
            <div className="summary-tile"><span>총 주행거리</span><span><b>{data?.latest_odometer ? fmt(data.latest_odometer) : '-'}</b> km</span></div>
          </div>
          <SegmentTabs className="records-tabs" options={tabOptions} value={filter} onChange={setFilter} allowDeselect />
        </header>

        <RecordsList key={`${filter ?? 'all'}-${revision}`} filter={filter} />
      </div>
      {carImageModal}
      <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      {cropModal}
    </>
  )
}
