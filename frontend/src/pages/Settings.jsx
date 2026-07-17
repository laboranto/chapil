import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
import DownloadIcon from '../assets/symbols/download.svg?react'
import UploadIcon   from '../assets/symbols/upload.svg?react'
import {
  getOrCreateCode, regenerateCode, deleteBackup, restoreFromCode,
  getRetentionMonths, setRetentionMonths,
} from '../recovery'

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
  const [searchParams] = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === '1'
  const { refreshSettings, fuelTerm } = useSettings()
  const importFileRef = useRef(null)
  const [form, setForm] = useState({
    car_birth: '', car_type: '', car_brand: '',
    car_model: '', car_plate: '', car_fuel: '',
  })
  const [options, setOptions] = useState({ car_type: [], car_fuel: [] })

  const [errors, setErrors] = useState({})

  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting]     = useState(false)
  const [exporting, setExporting]     = useState(false)
  const [importDone, setImportDone]   = useState(null)
  const [exportDone, setExportDone]   = useState('')
  const [importError, setImportError] = useState('')

  const [recoveryCode, setRecoveryCode] = useState(() => getOrCreateCode())
  const [retention, setRetention]       = useState(() => getRetentionMonths() ?? '')
  const [restoreCodeInput, setRestoreCodeInput] = useState('')
  const [restoring, setRestoring]       = useState(false)
  const [recoveryMsg, setRecoveryMsg]   = useState('')

  useEffect(() => {
    Promise.all([api.getSettings(), api.getSettingsOptions()]).then(
      ([settings, opts]) => {
        setForm(settings)
        setOptions(opts)
      }
    )
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const REQUIRED = {
    car_brand: '브랜드',
    car_model: '차량 이름',
    car_plate: '차량번호',
    car_fuel:  '연료',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    for (const [key, label] of Object.entries(REQUIRED)) {
      if (!form[key]) newErrors[key] = `${label}을(를) 입력해 주세요`
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    await api.updateSettings({
      ...form,
      car_type: form.car_type || null,
      car_fuel: form.car_fuel || null,
    })
    await refreshSettings()
    navigate('/')
  }

  const handleExport = async () => {
    setExporting(true)
    setExportDone(false)
    try {
      const filename = await api.exportToFile()
      setExportDone(filename)
    } catch (err) {
      setImportError(`내보내기 실패: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = () => importFileRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setImportError('')
    setPreviewData(null)
    setImportDone(null)
    try {
      let result;
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        result = await api.importFromXlsx(file)
      } else {
        result = await api.importFromFile(file)
      }
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
      const updatedSettings = await api.getSettings()
      setForm(updatedSettings)
    } catch (err) {
      setImportError(`가져오기 실패: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleRetentionChange = (e) => {
    const v = e.target.value
    setRetention(v)
    setRetentionMonths(v ? Number(v) : null)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setRecoveryMsg('복사되었습니다.')
    } catch {
      setRecoveryMsg('복사에 실패했습니다.')
    }
  }

  const handleRegenerateCode = async () => {
    const ok = window.confirm(
      '현재 코드로 저장된 서버 백업을 삭제하고 새 코드를 발급합니다.\n' +
      '기존 코드는 더 이상 복구에 사용할 수 없습니다. 계속할까요?'
    )
    if (!ok) return
    try {
      await deleteBackup(recoveryCode)
    } catch (err) {
      setRecoveryMsg(`삭제 실패: ${err.message}`)
      return
    }
    const fresh = regenerateCode()
    setRecoveryCode(fresh)
    setRecoveryMsg('새 코드가 발급되었습니다. 아래 코드를 다시 저장해 주세요.')
  }

  const handleRestore = async () => {
    if (!restoreCodeInput.trim()) return
    setRestoring(true)
    setImportError('')
    try {
      const data = await restoreFromCode(restoreCodeInput.trim())
      setPreviewData(api.importPreview(data))
    } catch (err) {
      setImportError(`복구 실패: ${err.message}`)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="topbar">
        {!isOnboarding
          ? <button type="button" className="btn-cancel" aria-label="취소" onClick={() => navigate(-1)}>✕</button>
          : <span />
        }
        <h1>설정</h1>
        <button type="submit" form="settings-form" className="btn-submit" aria-label="저장"></button>
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
            {errors.car_brand && <p className="field-error">{errors.car_brand}</p>}
          </div>

          <div className="form-group">
            <label>차량 이름</label>
            <input
              type="text"
              value={form.car_model}
              onChange={set('car_model')}
              placeholder="예: 아반떼, 코나, 아이오닉5"
            />
            {errors.car_model && <p className="field-error">{errors.car_model}</p>}
          </div>

          <div className="form-group">
            <label>차량번호</label>
            <input
              type="text"
              value={form.car_plate}
              onChange={set('car_plate')}
              placeholder="예: 123가4567"
            />
            {errors.car_plate && <p className="field-error">{errors.car_plate}</p>}
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
            {errors.car_fuel && <p className="field-error">{errors.car_fuel}</p>}
          </div>

        </form>

        <div className="section-header">데이터 관리</div>
        <div className="section-advice">
          <p>차필에서 작성하신 데이터는 기본적으로 사용자의 기기 내부에 저장됩니다. 아래 '복구코드 백업' 기능을 통해 24시간마다 암호화된 데이터가 자동으로 서버에 전송되며, 코드 없이는 개발자를 포함해 아무도 열람할 수 없습니다.</p>
          <p>기존에 다른 앱에서 차계부를 작성하고 계셨다면 해당 앱에서 엑셀 파일(xlsx)로 저장한 차계부 데이터를 차필에 변환하는 기능을 지원하고 있습니다. 아래 '데이터 가져오기' 버튼을 누르고 JSON 파일이나 엑셀(xlsx) 파일을 선택하면 됩니다.</p>

        </div>
        <div className="set-migrate">
          <button className="btn" onClick={handleImport}>
            <DownloadIcon/>데이터 가져오기
          </button>
          <button className="btn" onClick={handleExport} disabled={exporting}>
            <UploadIcon/>{exporting ? '내보내는 중…' : '데이터 내보내기'}
          </button>
          {exportDone && <p className="import-done-inline">{exportDone} 다운로드 완료</p>}
        </div>
        <input ref={importFileRef} type="file" accept=".json,application/json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={handleFileChange} />

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
              <div className="import-actions">
                <button
                  className="btn"
                  onClick={() => { setPreviewData(null); setImportError('') }}
                >
                  취소
                </button>
                <button
                  className="btn btn-import-confirm"
                  onClick={handleConfirm}
                  disabled={importing || previewData.errors.length > 0}
                >
                  가져오기 확정
                </button>
              </div>
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

        <div className="section-header">복구코드 백업</div>
        <div className="section-advice">
          <p>기기 손상 등에 대비해 24시간마다 암호화된 데이터가 자동으로 서버에 백업됩니다. 아래 코드가 있어야 복원할 수 있으니 안전한 곳에 보관하세요.</p>
        </div>
        <div className="recovery-code-box">
          <code>{recoveryCode}</code>
          <button type="button" className="btn" onClick={handleCopyCode}>복사</button>
        </div>
        <div className="form-group">
          <label>보존 기간</label>
          <select value={retention} onChange={handleRetentionChange}>
            <option value="">무기한 보관</option>
            <option value="12">1년 미접속 시 자동 삭제</option>
            <option value="6">6개월 미접속 시 자동 삭제</option>
          </select>
        </div>
        <div className="set-migrate">
          <button type="button" className="btn" onClick={handleRegenerateCode}>코드 재발급 및 기존 백업 삭제</button>
        </div>
        {recoveryMsg && <p className="import-done-inline">{recoveryMsg}</p>}

        <div className="form-group">
          <label>다른 코드로 복구</label>
          <input
            type="text"
            value={restoreCodeInput}
            onChange={(e) => setRestoreCodeInput(e.target.value)}
            placeholder="64자리 복구코드 입력"
          />
        </div>
        <div className="set-migrate">
          <button type="button" className="btn" onClick={handleRestore} disabled={restoring}>
            {restoring ? '복원하는 중…' : '코드로 복구'}
          </button>
        </div>

        <div className="section-header">기타</div>
        <div className="set-migrate">
          <button className="btn" onClick={() => navigate('/feedback')}>
            피드백 보내기
          </button>
        </div>

      </div>
    </>
  )
}
