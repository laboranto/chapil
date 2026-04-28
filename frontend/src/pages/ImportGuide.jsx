import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
// 버튼 아이콘(심볼) svg 이식
import DownloadIcon        from '../assets/symbols/download.svg?react'
import UploadIcon        from '../assets/symbols/upload.svg?react'
import CopyIcon from '../assets/symbols/copy.svg?react'

export default function ImportGuide() {
  const navigate = useNavigate()
  const [promptCopied, setPromptCopied] = useState(false)
  // previewData: { counts, records, vehicle, errors } — API /import/preview 응답
  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const [parseError, setParseError] = useState('')
  const [promptText, setPromptText] = useState('')

  // ── 프롬프트 보여주기 ──────────────────────────────────────────
useEffect(() => {
  api.getImportPrompt().then(({ prompt }) => setPromptText(prompt))
}, [])

  // ── 프롬프트 클립보드 복사 ──────────────────────────────────────────
const copyPrompt = async () => {
  await navigator.clipboard.writeText(promptText)
  setPromptCopied(true)
  setTimeout(() => setPromptCopied(false), 3500)
}

  // ── JSON 파일 선택 → 미리보기 ───────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParseError('')
    setPreviewData(null)
    setDone(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      let data
      try {
        data = JSON.parse(ev.target.result)
      } catch {
        setParseError('JSON 형식이 올바르지 않습니다. 파일을 확인해 주세요.')
        return
      }
      try {
        const result = await api.importPreview(data)
        setPreviewData(result)
      } catch (err) {
        setParseError(`서버 오류: ${err.message}`)
      }
    }
    reader.readAsText(file, 'utf-8')
  }
  const VEHICLE_LABELS = {
    car_type: '차종',
    car_brand: '브랜드',
    car_model: '차량명',
    car_plate: '번호판',
    car_birth: '출고일',
    car_fuel: '연료',
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

  // ── 가져오기 확정 ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!previewData) return
    const ok = window.confirm(
      `기존 데이터에 ${previewData.counts.fuel}건의 주유, ${previewData.counts.maintenance}건의 정비, ${previewData.counts.other}건의 기타 기록이 추가됩니다.\n` +
      '이 작업은 되돌릴 수 없습니다. 계속할까요?'
    )
    if (!ok) return
    setImporting(true)
    try {
      const result = await api.importConfirm({
        vehicle: previewData.vehicle,
        fuel: previewData.records.fuel,
        maintenance: previewData.records.maintenance,
        other: previewData.records.other,
      })
      setDone(result.imported)
      setPreviewData(null)
      await refreshSettings()
    } catch (err) {
      setParseError(`가져오기 실패: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  // 충전인지 주유인지 구분하여 표기
  const { fuelTerm, refreshSettings } = useSettings()

  return (
    <>
      <div className="topbar">
        <button className="btn-back" onClick={() => navigate('/settings')}>‹</button>
        <h1>데이터 가져오기</h1>
      </div>
      <div className="topbg"></div>
      <div className="content">

        {/* ── 1단계: 예제 파일 + 프롬프트 ── */}
        <div className="import-step">
          <div>
            <h3>1. 예제 파일과 프롬프트 준비</h3>
            <p>
              아래 버튼으로 예제 파일을 내려받고, 프롬프트를 복사하세요.
            </p>
            <div className="btn-wrap">
              <a className="btn" href={api.templateUrl()} download="chapil_template.json">
                <DownloadIcon/>예제 파일 다운로드
              </a>
              <span className={promptCopied ? 'notice' : 'notice transparent'}>복사 완료!</span>
              </div>
              <details>
                <summary>프롬프트 보기</summary>
                <div className="prompt">
                <div className="prompt-header">
                  <button onClick={copyPrompt}><CopyIcon/></button>
                </div>
                <pre>{promptText}</pre>
                </div>
              </details>
          </div>
          </div>

        {/* ── 2단계: LLM에 전달 ── */}
        <div className="import-step">
          <div>
            <h3>2. LLM으로 변환</h3>
            <p>
              하나, 다음 내용을 대화형 <b>인공지능(LLM)에 전달</b>하세요.
            </p>
            <ul className="prompt">
              <li>복사한 <b>프롬프트</b></li>
              <li>예제 파일: <b>chapil_template.json</b></li>
              <li>기존 차계부 앱에서 내보낸 <b>데이터 파일</b> (CSV, XLSX 등)</li>
            </ul>
            <p>
              둘, LLM이 만들어준 <b>파일(JSON)을 저장</b>하세요!
            </p>
          </div>
        </div>

        {/* ── 3단계: 파일 업로드 ── */}
        <div className="import-step">
          <div>
            <h3>3. 변환된 파일 업로드
              <label className="btn">
              JSON 파일 가져오기
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
              </label>
            </h3>
            {parseError && <p className="import-error">{parseError}</p>}

        {/* ── 미리보기 ── */}
        {previewData && (
          <div className="import-preview">

            {previewData.errors.length > 0 && (
              <div className="import-error-list">
                {previewData.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {previewData.vehicle && (
              <div className="preview-section">
                <p className="preview-section-label">데이터 미리보기</p>
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
                <div className="preview-counts">
                  <span>주유 <b>{previewData.counts.fuel}</b>건 | </span>
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
            )}
          </div>
        )}

        {/* ── 완료 ── */}
        {done && (
          <div className="import-done">
            <p><b>가져오기 완료!</b></p>
            <p>{fuelTerm} {done.fuel}건 · 정비 {done.maintenance}건 · 기타 {done.other}건</p>
          </div>
        )}
        <p className="import-loading">{importing ? '가져오는 중…' : ' '}</p>
        </div>
        </div>

</div>
    </>
  )
}