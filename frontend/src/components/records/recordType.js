import FuelIcon        from '../../assets/symbols/fuel.svg?react'
import ChargeIcon      from '../../assets/symbols/charge.svg?react'
import MaintenanceIcon from '../../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../../assets/symbols/other.svg?react'

export function getRecordType(src, fuelTerm = '주유') {
  if (src === 'fuel')
    return { label: fuelTerm, Icon: fuelTerm === '충전' ? ChargeIcon : FuelIcon }
  if (src === 'maintenance') return { label: '정비', Icon: MaintenanceIcon }
  return { label: '기타', Icon: OtherIcon }
}
