import { NavLink } from 'react-router-dom'
import HomeIcon     from '../assets/symbols/home.svg?react'
import RecordsIcon  from '../assets/symbols/records.svg?react'
import SettingsIcon from '../assets/symbols/settings.svg?react'

export default function BottomNav() {
  const cls = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '')
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={cls}><HomeIcon />홈</NavLink>
      <NavLink to="/records" className={cls}><RecordsIcon />기록</NavLink>
      <NavLink to="/settings" className={cls}><SettingsIcon />설정</NavLink>
    </nav>
  )
}
