import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStorageMode } from '../db'

const FEATURES = [
  '불필요한 요소는 덜어냈어요.\n오직 차량 관리에만 집중하세요!',
  '여기에 기록된 차량 데이터는\n어디에도 전송되지 않습니다.',
  '다른 앱으로부터 데이터를 옮기세요!\n(일부 앱만 지원)',
]

export default function Onboarding() {
  const carRef = useRef(null)
  const checkRef = useRef(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [slideIndex, setSlideIndex] = useState(-1)
  const [textVisible, setTextVisible] = useState(false)
  const [sliding, setSliding] = useState(false)
  const navigate = useNavigate()
  const storage = getStorageMode()

  let lsFirstSeen = null
  let lsError = null
  try {
    lsFirstSeen = localStorage.getItem('chapil-first-seen')
    if (!lsFirstSeen) {
      lsFirstSeen = new Date().toISOString()
      localStorage.setItem('chapil-first-seen', lsFirstSeen)
    }
  } catch (e) {
    lsError = e?.message ?? String(e)
  }

  useEffect(() => {
    const car = carRef.current
    const check = checkRef.current
    if (!car || !check) return

    let timer

    requestAnimationFrame(() => {
      const carLen = car.getTotalLength()
      const checkLen = check.getTotalLength()

      car.style.strokeDasharray = `${carLen}`
      car.style.strokeDashoffset = `${carLen}`
      check.style.strokeDasharray = `${checkLen}`
      check.style.strokeDashoffset = `${checkLen}`

      requestAnimationFrame(() => {
        car.style.transition = 'stroke-dashoffset 2s ease'
        car.style.strokeDashoffset = '0'

        timer = setTimeout(() => {
          check.style.transition = 'stroke-dashoffset 1s ease'
          check.style.strokeDashoffset = '0'
          setTimeout(() => { check.style.opacity = '1' }, 120)
          setShowWelcome(true)
          setTimeout(() => setTextVisible(true), 100)
        }, 1600)
      })
    })

    return () => clearTimeout(timer)
  }, [])

  const handleNext = () => {
    if (sliding) return
    setSliding(true)
    setTextVisible(false)
    setTimeout(() => {
      setSlideIndex(prev => prev + 1)
      setTextVisible(true)
      setSliding(false)
    }, 280)
  }

  const handlePrev = () => {
    if (sliding) return
    setSliding(true)
    setTextVisible(false)
    setTimeout(() => {
      setSlideIndex(prev => prev - 1)
      setTextVisible(true)
      setSliding(false)
    }, 280)
  }

  const isLastSlide = slideIndex === FEATURES.length - 1

  return (
    <div className="onboarding">
      <svg viewBox="100 130 300 185" className="onboarding-icon" aria-hidden="true">
        <g transform="translate(83.3, 133.3)">
          <path
            ref={carRef}
            fill="none"
            stroke="currentColor"
            strokeWidth="12.5"
            strokeLinecap="round"
            style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
            d="m 161.9053,158.95802 -93.29368,3.1e-4 c -14.939993,4e-5 -22.67412,-1.95127 -22.67412,-22.67413 0,-11.00313 5.79476,-28.58696 16.504696,-28.58696 h 15.291468 c 3.001587,0 4.984407,-3.85915 6.521557,-6.52156 5.379053,-9.31682 15.41094,-23.367102 25.423309,-23.367102 h 18.30914 c 17.06583,0 14.45811,31.739032 25.27263,31.739032 9.45446,0 12.97242,1.48303 16.32001,7.28122 2.665,4.61594 2.28476,17.591 4.57361,26.13311 2.93649,10.95914 6.06149,15.99608 27.56121,15.99608 h 76.28899"
          />
          <path
            ref={checkRef}
            fill="none"
            stroke="currentColor"
            strokeWidth="12.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 1000, strokeDashoffset: 1000, opacity: 0 }}
            d="M 154.75666,66.467811 173.06884,92.8125 218.64583,25.937501"
          />
        </g>
      </svg>

      <div className={`onboarding-welcome${showWelcome ? ' visible' : ''}`}>
        <div className={`onboarding-slide-text${textVisible ? ' visible' : ''}`}>
          {slideIndex === -1
            ? <h3>반갑습니다, 차필입니다</h3>
            : <p className="onboarding-feature">{FEATURES[slideIndex]}</p>
          }
        </div>
        {slideIndex >= 0 && (
          <div className="onboarding-dots">
            {FEATURES.map((_, i) => (
              <span key={i} className={`onboarding-dot${i === slideIndex ? ' active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      <div className="onboarding-bottom">
        {slideIndex >= 0
          ? <button className="onboarding-arrow-btn" onClick={handlePrev} aria-label="이전">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
          : <span />
        }
        {isLastSlide
          ? <button className="onboarding-btn" onClick={() => navigate('/settings?onboarding=1')}>
              차계부 시작하기
            </button>
          : <span />
        }
        {showWelcome && !isLastSlide
          ? <button className="onboarding-arrow-btn" onClick={handleNext} aria-label="다음">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          : <span />
        }
      </div>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
          textAlign: 'center',
          fontSize: 9,
          opacity: 0.6,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          color: (storage.mode === 'memory' || storage.mode === 'unknown') ? '#c00' : '#0a0',
          padding: '0 8px',
          lineHeight: 1.3,
        }}
      >
        <div>storage: {storage.mode} / coi: {String(self.crossOriginIsolated)}</div>
        <div>
          FSH:{String(!!self.FileSystemHandle)} DH:{String(!!self.FileSystemDirectoryHandle)} FH:{String(!!self.FileSystemFileHandle)} SAH:{String(!!self.FileSystemFileHandle?.prototype?.createSyncAccessHandle)} gD:{String(!!navigator?.storage?.getDirectory)}
        </div>
        <div>ls: {lsError ? `err ${lsError}` : (lsFirstSeen ?? 'null')}</div>
        <div style={{ wordBreak: 'break-all' }}>ua: {navigator.userAgent}</div>
        {storage.reason ? <div>err: {storage.reason}</div> : null}
      </div>
    </div>
  )
}