import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLogs, getDeviceInfo } from '../logger.js'

async function submitFeedback(payload) {
  const res = await fetch(
    'https://iranto.synology.me/nextcloud/ocs/v2.php/apps/forms/api/v3/forms/1/submissions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'OCS-APIRequest': 'true' },
      body: JSON.stringify({ shareHash: '57daHLPC74Y3fL5wa4KPWDip', answers: { 1: [payload] } }),
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export default function Feedback() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error

  const handleSubmit = async () => {
    if (!text.trim()) return
    setStatus('sending')
    const info = getDeviceInfo()
    const logs = getLogs()
    const payload = [
      `[피드백]\n${text.trim()}`,
      `\n[기기 정보]\n앱 버전: ${info.appVersion}\nAndroid: ${info.android ?? '알 수 없음'}\n모델: ${info.model ?? '알 수 없음'}\nWebView: ${info.webview ?? '알 수 없음'}`,
      logs.length > 0
        ? `\n[오류 위치 기록 (${logs.length}건)]\n` + logs.map(l => `${l.at}\n${l.trace}`).join('\n---\n')
        : '\n[오류 기록 없음]',
    ].join('')

    try {
      await submitFeedback(payload)
      setStatus('done')
    } catch (err) {
      setStatus(err.message || '알 수 없는 오류')
    }
  }

  return (
    <>
      <div className="topbar">
        <button type="button" className="btn-cancel" aria-label="취소" onClick={() => navigate(-1)}>✕</button>
        <h1>피드백</h1>
      </div>
      <div className="topbg"></div>
      <div className="content">
        {status === 'done' ? (
          <div className="feedback-done">
            <p>소중한 의견 감사합니다!</p>
            <button className="btn" onClick={() => navigate(-1)}>돌아가기</button>
          </div>
        ) : (
          <>
            <div className="section-header">의견 보내기</div>
            <div className="form-group">
              <textarea
                className="feedback-textarea"
                placeholder="불편하신 점, 개선 아이디어, 오류 내용 등 자유롭게 적어주세요."
                value={text}
                onChange={e => setText(e.target.value)}
                rows={7}
              />
            </div>
            <div className="feedback-notice">
              <p>피드백과 함께 다음 정보가 자동으로 포함됩니다.</p>
              <ul>
                <li>앱 버전, 기기 모델명, Android 버전</li>
                <li>오류가 발생한 코드 위치 (줄 번호만 — 입력하신 데이터는 포함되지 않습니다)</li>
              </ul>
            </div>
            {status !== 'idle' && status !== 'sending' && status !== 'done' && (
              <p className="import-error">{status}</p>
            )}
            <div className="feedback-submit-row">
              <button
                className="btn btn-import-confirm"
                onClick={handleSubmit}
                disabled={!text.trim() || status === 'sending'}
              >
                {status === 'sending' ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}