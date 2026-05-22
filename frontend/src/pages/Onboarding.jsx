import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const carRef = useRef(null)
  const checkRef = useRef(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const navigate = useNavigate()

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
          setShowWelcome(true)
        }, 1600)
      })
    })

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="onboarding">
      <svg
        viewBox="100 130 300 185"
        className="onboarding-icon"
        aria-hidden="true"
      >
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
            style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
            d="M 154.75666,66.467811 173.06884,92.8125 218.64583,25.937501"
          />
        </g>
      </svg>
      <div className={`onboarding-welcome${showWelcome ? ' visible' : ''}`}>
        <h3>반갑습니다, 차필입니다</h3>
      </div>
      <button
        className={`onboarding-btn${showWelcome ? ' visible' : ''}`}
        onClick={() => navigate('/settings?onboarding=1')}
      >
        차계부 시작하기
      </button>
    </div>
  )
}
