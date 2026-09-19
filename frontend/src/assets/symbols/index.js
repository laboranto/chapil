import { detectTheme } from '../../theme'

// 아이콘은 테마마다 출처가 다르다(NOTICE.md 참고). 이름은 같고 폴더만 갈린다.
//
// 27장이 전부 번들에 들어가지만 합쳐 12KB 남짓이라 코드 분할을 할 이유가 없다.
// 테마는 한 번 정해지면 새로고침 전까지 안 바뀌므로 모듈 로드 때 한 번만 고른다.
const mods = import.meta.glob('./*/*.svg', { query: '?react', eager: true, import: 'default' })
const theme = detectTheme()

// breeze에 없어 손으로 그린 것도 있지만 이름은 셋 다 갖춰져 있다.
// 혹시 빠지면 material로 떨어뜨린다 — 아이콘 하나 때문에 화면이 죽으면 안 된다.
const pick = (name) => mods[`./${theme}/${name}.svg`] ?? mods[`./material/${name}.svg`]

export const FuelIcon        = pick('fuel')
export const ChargeIcon      = pick('charge')
export const MaintenanceIcon = pick('maintenance')
export const OtherIcon       = pick('other')
export const CarIcon         = pick('car')
export const SettingsIcon    = pick('settings')
export const ImportIcon      = pick('import')
export const ExportIcon      = pick('export')
export const CopyIcon        = pick('copy')
