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
  return () => (key !== 'default' ? navigate(-1) : navigate(fallback, { replace: true }))
}
