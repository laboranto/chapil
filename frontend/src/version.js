// 앱 버전 단일 소스. 홈 화면 표시와 피드백 전송(logger.js)이 이 값을 공유한다.
// 'v' 접두사는 표시하는 쪽에서 붙인다.
// android/app/build.gradle의 versionName도 같은 값으로 맞출 것.
// 같은 날 재배포하면 '-1', '-2'로 빌드 순번을 붙인다(versionCode 끝자리와 동일).
export const VERSION = '26.9.20';
