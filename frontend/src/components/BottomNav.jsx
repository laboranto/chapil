import { NavLink } from 'react-router-dom'
import HomeIcon        from '../assets/symbols/home.svg?react'
import FuelIcon        from '../assets/symbols/oil_and_electric.svg?react'
import MaintenanceIcon from '../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../assets/symbols/other.svg?react'
import { useSettings } from '../context/SettingsContext'

export default function BottomNav() {
  const cls = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '')
  const { fuelTerm } = useSettings()

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={cls}>
        <HomeIcon />
        홈
      </NavLink>
      <NavLink to="/fuel" className={cls}>
        <FuelIcon />
        {fuelTerm}
      </NavLink>
      <NavLink to="/maintenance" className={cls}>
        <MaintenanceIcon />
        정비
      </NavLink>
      <NavLink to="/other" className={cls}>
        <OtherIcon />
        기타
      </NavLink>
    </nav>
  )
}
