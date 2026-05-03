import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
import DownloadIcon from '../assets/symbols/download.svg?react'
import UploadIcon   from '../assets/symbols/upload.svg?react'

const VEHICLE_LABELS = {
  car_type: '차종', car_brand: '브랜드', car_model: '차량명',
  car_plate: '번호판', car_birth: '출고일', car_fuel: '연료',
}
const TYPE_LABELS = {
  microcar: '경차', small: '소형차', compact: '준중형차', midsize: '중형차',
  large: '준대형차', fullsize: '대형차', suv: 'SUV', rv: 'RV', van: '밴',
  truck: '트럭', other: '기타',
}
const FUEL_LABELS = {
  gasoline: '휘발유', diesel: '경유', hev: '하이브리드', lpg: 'LPG',
  ev: '전기', fcev: '수소전지', bifuel: '바이퓨얼 (휘발유+LPG)', phev: '플러그인 하이브리드',
}

export default function Settings() {
  const navigate = useNavigate()
  const { refreshSettings, fuelTerm } = useSettings()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    car_birth: '', car_type: '', car_brand: '',
    car_model: '', car_plate: '', car_fuel: '',
  })
  const [options, setOptions] = useState({ car_type: [], car_fuel: [] })

  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting]     = useState(false)
  const [importDone, setImportDone]   = useState(null)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    Promise.all([api.getSettings(), api.getSettingsOptions()]).then(
      ([settings, opts]) => {
        setForm(settings)
        setOptions(opts)
      }
    )
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await api.updateSettings({
      ...form,
      car_type: form.car_type || null,
      car_fuel: form.car_fuel || null,
    })
    await refreshSettings()
    navigate('/')
  }

  const handleXlsxFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImportError('')
    setPreviewData(null)
    setImportDone(null)
    try {
      const result = await api.importXlsx(file)
      setPreviewData(result)
    } catch (err) {
      setImportError(`파일 오류: ${err.message}`)
    }
  }

  const handleConfirm = async () => {
    if (!previewData) return
    const ok = window.confirm(
      `기존 데이터에 ${previewData.counts.fuel}건의 ${fuelTerm}, ` +
      `${previewData.counts.maintenance}건의 정비, ` +
      `${previewData.counts.other}건의 기타 기록이 추가됩니다.\n` +
      '이 작업은 되돌릴 수 없습니다. 계속할까요?'
    )
    if (!ok) return
    setImporting(true)
    try {
      const result = await api.importConfirm({
        vehicle:     previewData.vehicle,
        fuel:        previewData.records.fuel,
        maintenance: previewData.records.maintenance,
        other:       previewData.records.other,
      })
      setImportDone(result.imported)
      setPreviewData(null)
      await refreshSettings()
    } catch (err) {
      setImportError(`가져오기 실패: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>설정</h1>
        <button type="submit" form="settings-form" className="btn-submit">✓</button>
      </div>
      <div className="topbg"></div>
      <div className="content">
        <form id="settings-form" onSubmit={handleSubmit}>

          <div className="section-header">차량 정보</div>

          <div className="form-group">
            <label>차종</label>
            <select value={form.car_type} onChange={set('car_type')}>
              <option value="">선택 안 함</option>
              {options.car_type.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>브랜드</label>
            <input
              type="text"
              value={form.car_brand}
              onChange={set('car_brand')}
              placeholder="예: 현대, 기아, BMW"
            />
          </div>

          <div className="form-group">
            <label>차량 이름</label>
            <input
              type="text"
              value={form.car_model}
              onChange={set('car_model')}
              placeholder="예: 아반떼, 코나, 아이오닉5"
            />
          </div>

          <div className="form-group">
            <label>차량번호</label>
            <input
              type="text"
              value={form.car_plate}
              onChange={set('car_plate')}
              placeholder="예: 123가4567"
            />
          </div>

          <div className="form-group">
            <label>출고일자</label>
            <input
              type="date"
              value={form.car_birth}
              onChange={set('car_birth')}
            />
          </div>

          <div className="form-group">
            <label>연료</label>
            <select value={form.car_fuel} onChange={set('car_fuel')}>
              <option value="">선택 안 함</option>
              {options.car_fuel.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>

        </form>

        <div className="section-header">데이터 관리</div>
        <div className="section-advice">
          <p>차필에서 작성하신 데이터는 사용자의 기기 내부에 저장되며, 어디에도 전송되지 않습니다. 사용자께서 주기적으로 '데이터 내보내기'를 통하여 개인 드라이브, 클라우드 등 안전한 장소에 백업(보관)하실 것을 권장 드립니다.</p>
          <p>또한 앱에서 자체 백업을 진행하고 있습니다. 자동 백업 경로는 다음과 같습니다.</p>
          <p className="prompt">(앱 설치 경로)/backups/chapil_backup_(날짜).json</p>
        </div>
        <div className="set-migrate">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <DownloadIcon/>데이터 가져오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleXlsxFile}
            style={{ display: 'none' }}
          />
          <a className="btn" href={api.exportUrl()} download="chapil_export.json">
            <UploadIcon/>데이터 내보내기
          </a>
        </div>

        {importError && <p className="import-error">{importError}</p>}

        {previewData && (
          <div className="import-preview">
            {previewData.errors.length > 0 && (
              <div className="import-error-list">
                {previewData.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="preview-section">
              <p className="preview-section-label">데이터 미리보기</p>
              {previewData.vehicle && (
                <div className="preview-kv">
                  {Object.entries(previewData.vehicle)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="preview-kv-row">
                        <span className="preview-kv-key">{VEHICLE_LABELS[k] ?? k}</span>
                        <span className="preview-kv-val">
                          {k === 'car_type' ? (TYPE_LABELS[v] ?? v)
                           : k === 'car_fuel' ? (FUEL_LABELS[v] ?? v)
                           : v}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              <div className="preview-counts">
                <span>{fuelTerm} <b>{previewData.counts.fuel}</b>건 | </span>
                <span>정비 <b>{previewData.counts.maintenance}</b>건 | </span>
                <span>기타 <b>{previewData.counts.other}</b>건</span>
              </div>
              <button
                className="btn btn-import-confirm"
                onClick={handleConfirm}
                disabled={importing || previewData.errors.length > 0}
              >
                가져오기 확정
              </button>
            </div>
          </div>
        )}

        {importDone && (
          <div className="import-done">
            <p><b>가져오기 완료!</b></p>
            <p>{fuelTerm} {importDone.fuel}건 · 정비 {importDone.maintenance}건 · 기타 {importDone.other}건</p>
          </div>
        )}
        {importing && <p className="import-loading">가져오는 중…</p>}

      </div>
    </>
  )
}
