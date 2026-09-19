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
