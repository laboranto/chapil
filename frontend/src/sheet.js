import { useNavigate, useLocation } from 'react-router-dom'

// 기록 양식·설정을 시트(팝업)로 띄울지, 지금까지처럼 전체 페이지로 띄울지 가른다.
//
// dialog.showModal()은 Safari 15.4+다. Xcode의 IPHONEOS_DEPLOYMENT_TARGET은
// Capacitor 네이티브 앱에만 걸리고, 이 앱의 현재 설치 경로는 웹이라(README의
// 공개 데모·셀프호스팅) 그 값이 브라우저 하한을 대변하지 않는다.
//
// 떨어질 자리를 따로 만들 필요는 없다 — 전체 페이지 렌더는 딥링크(주소창에
// /records/new 직접 입력, 북마크) 때문에 어차피 있어야 한다. 여기서는 state를
// 안 실어 보내기만 하면 App의 라우트가 알아서 그 경로로 간다.
export const canSheet = () =>
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype?.showModal === 'function'

export const sheetState = (location) => (canSheet() ? { background: location } : undefined)

// 닫기·취소·저장 후 복귀. 시트로 떴으면 반드시 pop해야 한다 — navigate('/')로
// push하면 시트는 닫히지만 히스토리에 쌓여서, 뒤로가기를 누르면 배경 state가
// 실린 URL로 돌아가 시트가 다시 열린다.
//
// 시트가 아닐 때도 앱 안에서 넘어왔으면 pop이 "열기 직전"으로 정확히 돌린다.
// 첫 진입(딥링크·북마크·새 탭)만 돌아갈 데가 없어 fallback으로 대신한다 —
// 초기 히스토리 항목의 key는 'default'다(react-router createBrowserHistory,
// chunk-QFMPRPBF.mjs:136 `globalHistory.state?.key || "default"`).
export function useClose(fallback = '/') {
  const navigate = useNavigate()
  const { key } = useLocation()
  const go = () => (key !== 'default' ? navigate(-1) : navigate(fallback, { replace: true }))

  // 시트가 떠 있으면 내려간 뒤에 라우트를 돌린다. 라우트가 바뀌는 순간 Sheet가
  // 언마운트되므로 CSS만으로는 나가는 모션을 못 준다 — 모양은 index.css의
  // .sheet-dialog.closing이 쥐고, 여기서는 끝날 때까지 기다리기만 한다.
  // 닫기는 여기 한 곳으로 다 모이므로(✕·백드롭·Esc·저장 후 복귀) 여기만 고치면 된다.
  return () => {
    const dlg = document.querySelector('.sheet-dialog[open]')
    if (!dlg) return go()
    if (dlg.classList.contains('closing')) return   // 두 번 누르면 뒤로도 두 칸 간다
    // 아직 올라오는 중에 닫으면 나가는 애니메이션이 제자리(transform 없음)에서
    // 시작해 시트가 위로 한 번 튄다. 지금 있는 자리를 기본 스타일로 박아두면
    // 거기서 이어받는다 — 애니메이션은 인라인 스타일보다 우선이라 안 부딪힌다.
    const sheet = dlg.firstElementChild
    if (sheet.getAnimations().some(a => a.animationName && a.playState === 'running')) {
      const now = getComputedStyle(sheet)
      sheet.style.transform = now.transform     // 모바일: 올라오던 높이
      sheet.style.opacity = now.opacity         // 데스크탑: 뜨던 중의 투명도
      dlg.style.setProperty('--bd-from', getComputedStyle(dlg, '::backdrop').opacity)
    }
    dlg.classList.add('closing')
    // animationName이 있는 것만 = CSS 애니메이션. 전역 transition(all 0.22s)이
    // .closing의 pointer-events를 물고 시트 안 요소마다 전이를 하나씩 만드는데,
    // 그건 기다릴 대상이 아니다. 모션을 끈 환경에선 비어서 즉시 돌아간다.
    const out = dlg.getAnimations({ subtree: true }).filter(a => a.animationName)
    Promise.allSettled(out.map(a => a.finished)).then(go)
  }
}
