import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import SegmentTabs from '../components/SegmentTabs'
import FuelForm from './FuelForm'
import MaintenanceForm from './MaintenanceForm'
import OtherForm from './OtherForm'
import FuelIcon        from '../assets/symbols/fuel.svg?react'
import ChargeIcon      from '../assets/symbols/charge.svg?react'
import MaintenanceIcon from '../assets/symbols/maintenance.svg?react'
import OtherIcon       from '../assets/symbols/other.svg?react'

const FORM = { fuel: FuelForm, maintenance: MaintenanceForm, other: OtherForm }

export default function RecordForm() {
  const navigate = useNavigate()
  const { fuelTerm } = useSettings()
  const [tab, setTab] = useState('fuel')
  const formRef = useRef(null)

  const options = [
    { key: 'fuel', label: fuelTerm, Icon: fuelTerm === '충전' ? ChargeIcon : FuelIcon },
    { key: 'maintenance', label: '정비', Icon: MaintenanceIcon },
    { key: 'other', label: '기타', Icon: OtherIcon },
  ]

  const handleTab = (key) => {
    if (key === tab) return
    if (formRef.current?.isDirty() && !window.confirm('입력 중인 내용을 버리고 이동할까요?')) return
    setTab(key)
  }

  const Form = FORM[tab]

  return (
    <div>
      <div className="topbar">
        <button type="button" className="btn-cancel" aria-label="취소" onClick={() => navigate('/records')}>✕</button>
        <button type="button" className="btn-submit" aria-label="저장" onClick={() => formRef.current?.submit()}></button>
      </div>
      <div className="topbg"></div>
      <SegmentTabs className="form-tabs" options={options} value={tab} onChange={handleTab} allowDeselect={false} />
      <Form key={tab} ref={formRef} mode="embedded" />
    </div>
  )
}
