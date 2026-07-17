import { useState } from 'react'
import { getOrCreateCode, acknowledgeNotice, setRetentionMonths, copyToClipboard } from '../recovery'

export default function RecoveryCodeModal({ onClose }) {
  const [code] = useState(() => getOrCreateCode())
  const [retention, setRetention] = useState('')
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleCopy = async () => {
    setCopied(await copyToClipboard(code))
  }

  const handleConfirm = () => {
    setRetentionMonths(retention ? Number(retention) : null)
    acknowledgeNotice()
    onClose()
  }

  return (
    <div className="recovery-modal-overlay">
      <div className="recovery-modal">
        <h2>복구코드가 발급되었습니다</h2>
        <p>
          서버에는 이 코드로 암호화된 데이터만 저장되며, 관리자를 포함해 코드 없이는
          아무도 열람할 수 없습니다.
        </p>
        <p>
          <b>이 코드는 지금 기기 안에만 저장되어 있습니다.</b> 브라우저 저장소가
          초기화되거나 앱을 지우면 코드 자체도 함께 사라지므로, 지금 바로 복사해서
          별도로(메모 앱, 다른 기기 등) 보관해야만 나중에 복원이 가능합니다.
        </p>
        <div className="recovery-code-box">
          <code className={revealed ? '' : 'code-hidden'}>{code}</code>
          <button type="button" className="btn" onClick={() => setRevealed((r) => !r)}>
            {revealed ? '숨기기' : '보이기'}
          </button>
          <button type="button" className="btn" onClick={handleCopy}>
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <div className="form-group">
          <label>보존 기간</label>
          <select value={retention} onChange={(e) => setRetention(e.target.value)}>
            <option value="">무기한 보관 (기본값)</option>
            <option value="12">1년 미접속 시 자동 삭제</option>
            <option value="6">6개월 미접속 시 자동 삭제</option>
          </select>
        </div>
        <button type="button" className="btn btn-import-confirm" onClick={handleConfirm}>
          확인
        </button>
      </div>
    </div>
  )
}
