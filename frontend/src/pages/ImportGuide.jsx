import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ImportGuide() {
  const navigate = useNavigate()
  const [promptCopied, setPromptCopied] = useState(false)
  // previewData: { counts, records, vehicle, errors } — API /import/preview 응답
  const [previewData, setPreviewData] = useState(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const [parseError, setParseError] = useState('')

  // ── 프롬프트 클립보드 복사 ──────────────────────────────────────────
  const copyPrompt = async () => {
    const { prompt } = await api.getImportPrompt()
    await navigator.clipboard.writeText(prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
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

  // ── 가져오기 확정 ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!previewData) return
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
    } catch (err) {
      setParseError(`가져오기 실패: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

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
          <div className="import-step-num">1</div>
          <div className="import-step-body">
            <p className="import-step-title">예제 파일과 프롬프트 준비</p>
            <p className="import-step-desc">
              아래 버튼으로 예제 파일을 내려받고, 프롬프트를 복사하세요.
            </p>
            <div className="import-btns">
              <a className="btn-action" href={api.templateUrl()} download="chapil_template.json">
                예제 파일 다운로드
              </a>
              <button className="btn-action" onClick={copyPrompt}>
                {promptCopied ? '복사됨 ✓' : '프롬프트 복사'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 2단계: LLM에 전달 ── */}
        <div className="import-step">
          <div className="import-step-num">2</div>
          <div className="import-step-body">
            <p className="import-step-title">LLM으로 변환</p>
            <p className="import-step-desc">
              다음 내용을 대화형 인공지능(LLM)에 전달하세요.
            </p>
            <ul className="import-checklist">
              <li>복사한 프롬프트</li>
              <li>예제 파일 <code>chapil_template.json</code></li>
              <li>기존 차계부 앱에서 내보낸 파일 (CSV, XLSX 등)</li>
            </ul>
            <p className="import-step-desc">
              LLM이 생성한 변환 파일(JSON)을 저장하세요!
            </p>
          </div>
        </div>

        {/* ── 3단계: 파일 업로드 ── */}
        <div className="import-step">
          <div className="import-step-num">3</div>
          <div className="import-step-body">
            <p className="import-step-title">변환된 파일 업로드</p>
            <label className="btn-action btn-file-label">
              JSON 파일 선택
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </label>
            {parseError && <p className="import-error">{parseError}</p>}
          </div>
        </div>

        {/* ── 미리보기 ── */}
        {previewData && (
          <div className="import-preview">
            <p className="import-step-title">미리보기</p>

            {previewData.errors.length > 0 && (
              <div className="import-error-list">
                {previewData.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {previewData.vehicle && (
              <div className="preview-section">
                <p className="preview-section-label">차량 정보</p>
                <div className="preview-kv">
                  {Object.entries(previewData.vehicle)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="preview-kv-row">
                        <span className="preview-kv-key">{k}</span>
                        <span className="preview-kv-val">{v}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="preview-counts">
              <span>주유 {previewData.counts.fuel}건</span>
              <span>정비 {previewData.counts.maintenance}건</span>
              <span>기타 {previewData.counts.other}건</span>
            </div>

            <button
              className="btn-submit btn-import-confirm"
              onClick={handleConfirm}
              disabled={importing || previewData.errors.length > 0}
            >
              {importing ? '가져오는 중…' : '가져오기 확정'}
            </button>
          </div>
        )}

        {/* ── 완료 ── */}
        {done && (
          <div className="import-done">
            <p>가져오기 완료!</p>
            <p>주유(충전) {done.fuel}건 · 정비 {done.maintenance}건 · 기타 {done.other}건</p>
            <button className="btn-action" onClick={() => navigate('/')}>
              홈으로
            </button>
          </div>
        )}

      </div>
    </>
  )
}