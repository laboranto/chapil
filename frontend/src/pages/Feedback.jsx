import { useState } from 'react'
import { useClose } from '../sheet'
import { getLogs, getDeviceInfo } from '../logger.js'

// 피드백만은 각자의 서버가 아니라 개발자 서버로 모여야 하므로 절대 URL을 쓴다.
// (복구 백업 recovery.js는 반대로 상대 경로여야 한다 — 각 사용자 본인 서버로 가야 하므로)
const FEEDBACK_ENDPOINT = 'https://chapil-demo.varmakoro.net/api/feedback'

// 서버(app/feedback.py MAX_TEXT_LEN)와 같은 값. 넘기면 서버가 400을 주므로
// 입력 단계에서 막아 "HTTP 400"만 보이는 상황을 피한다.
const MAX_TEXT_LEN = 4000

async function submitFeedback(payload) {
  const res = await fetch(FEEDBACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export default function Feedback() {
  const close = useClose('/settings')
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error

  const handleSubmit = async () => {
    if (!text.trim()) return
    setStatus('sending')
    const info = getDeviceInfo()
    // 서버가 마크다운으로 조판하므로 문자열로 합치지 않고 필드를 나눠 보낸다.
    const payload = {
      text: text.trim(),
      appVersion: info.appVersion,
      android: info.android,
      model: info.model,
      webview: info.webview,
      logs: getLogs(),
    }

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
        <button type="button" className="btn-cancel" aria-label="취소" onClick={close}>✕</button>
        <h1>피드백</h1>
      </div>
      <div className="topbg"></div>
      <div className="content">
        {status === 'done' ? (
          <div className="feedback-done">
            <p>소중한 의견 감사합니다!</p>
            <button className="btn" onClick={close}>돌아가기</button>
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
                maxLength={MAX_TEXT_LEN}
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