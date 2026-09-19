// OS를 판별해 테마 이름을 돌려준다. 이 값이 <html data-theme>에 찍히고
// index.css가 거기 맞는 토큰 세트를 적용한다.
//
// iPadOS 13+는 UA를 Macintosh로 보내지만 어차피 같은 apple 테마라 구분할 이유가 없다.
// 판별에 실패하면 breeze로 떨어지는데, index.css의 breeze 블록이 맨 :root도 겸하므로
// 이 모듈이 아예 안 돌아도 화면은 멀쩡하다.
export function detectTheme(ua = navigator.userAgent) {
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua)) return 'apple'
  if (/Android/.test(ua)) return 'material'
  return 'breeze'
}
