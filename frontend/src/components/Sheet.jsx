import { useEffect, useRef } from 'react'
import { useClose } from '../sheet'

// 기록 양식·설정을 배경 위에 덮는 시트. 모바일은 아래에서, 데스크탑은 중앙에서
// 뜬다(모양은 전부 index.css의 .sheet-dialog / .sheet).
//
// 닫기는 반드시 라우트로 돌린다. dialog.close()를 직접 부르면 시트만 사라지고
// URL은 그대로라 주소와 화면이 어긋난다.
export default function Sheet({ children }) {
  const ref = useRef(null)
  const close = useClose()

  useEffect(() => {
    ref.current.showModal()
    // showModal()은 iOS Safari에서 배경 스크롤을 막아주지 않는다.
    // overflow:hidden을 걸면 iOS가 스크롤 위치를 잃으므로 되돌려준다.
    const y = window.scrollY
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      window.scrollTo(0, y)
    }
  }, [])

  const dismiss = (e) => { e.preventDefault(); close() }

  // 백드롭 판정은 click 하나로는 모자란다. 시트 안 textarea에서 드래그를 시작해
  // 시트 밖에서 떼면 click의 target이 공통 조상인 <dialog>로 올라가, 입력 중이던
  // 양식이 확인도 없이 닫힌다. 누른 자리도 백드롭이었을 때만 닫는다.
  const downOnBackdrop = useRef(false)

  return (
    <dialog
      ref={ref}
      className="sheet-dialog"
      onCancel={dismiss}
      /* target이 dialog 자신이면 백드롭을 누른 것이다. 안쪽 .sheet를 누르면 다르다. */
      onPointerDown={(e) => { downOnBackdrop.current = e.target === ref.current }}
      onClick={(e) => { if (downOnBackdrop.current && e.target === ref.current) dismiss(e) }}
    >
      <div className="sheet">{children}</div>
    </dialog>
  )
}
