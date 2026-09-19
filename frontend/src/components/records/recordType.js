import { FuelIcon, ChargeIcon, MaintenanceIcon, OtherIcon } from '../../assets/symbols'

export function getRecordType(src, fuelTerm = '주유') {
  if (src === 'fuel')
    return { label: fuelTerm, Icon: fuelTerm === '충전' ? ChargeIcon : FuelIcon }
  if (src === 'maintenance') return { label: '정비', Icon: MaintenanceIcon }
  return { label: '기타', Icon: OtherIcon }
}
