// OS를 판별해 테마 이름을 돌려준다. 이 값이 <html data-theme>에 찍히고
// index.css가 거기 맞는 토큰 세트를 적용한다.
//
// iPadOS 13+는 UA를 Macintosh로 보내지만 어차피 같은 apple 테마라 구분할 이유가 없다.
// 판별에 실패하면 breeze로 떨어지는데, index.css의 breeze 블록이 맨 :root도 겸하므로
// 이 모듈이 아예 안 돌아도 화면은 멀쩡하다.
export const THEMES = ['breeze', 'material', 'apple']

const byUA = (ua) => {
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua)) return 'apple'
  if (/Android/.test(ua)) return 'material'
  return 'breeze'
}

// 수동 지정이 UA보다 앞선다. 리눅스·윈도우 개발기에서는 UA가 늘 breeze라
// 나머지 둘을 볼 방법이 없었다(콘솔에서 data-theme을 찍어도 main.jsx가
// 다음 로드 때 다시 덮는다). ?theme=apple로 한 번 지정하면 저장되고,
// ?theme=auto로 지운다. 목업 촬영도 이 경로를 쓴다.
const KEY = 'chapil.theme'

export function detectTheme(ua = navigator.userAgent, search = globalThis.location?.search ?? '') {
  const asked = new URLSearchParams(search).get('theme')
  try {
    if (asked === 'auto') localStorage.removeItem(KEY)
    else if (THEMES.includes(asked)) localStorage.setItem(KEY, asked)
    const saved = localStorage.getItem(KEY)
    if (THEMES.includes(saved)) return saved
  } catch { /* 사생활 보호 모드 등에서 막히면 UA 판별로 떨어진다 */ }
  return byUA(ua)
}
