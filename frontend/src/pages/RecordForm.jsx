import { useState, useRef } from 'react'
import { useClose } from '../sheet'
import { useSettings } from '../context/SettingsContext'
import SegmentTabs from '../components/SegmentTabs'
import FuelForm from './FuelForm'
import MaintenanceForm from './MaintenanceForm'
import OtherForm from './OtherForm'
import { getRecordType } from '../components/records/recordType'

const FORM = { fuel: FuelForm, maintenance: MaintenanceForm, other: OtherForm }

export default function RecordForm() {
  const close = useClose()
  const { fuelTerm } = useSettings()
  const [tab, setTab] = useState('fuel')
  const formRef = useRef(null)

  const options = ['fuel', 'maintenance', 'other'].map(key => ({ key, ...getRecordType(key, fuelTerm) }))

  const handleTab = (key) => {
    if (key === tab) return
    if (formRef.current?.isDirty() && !window.confirm('입력 중인 내용을 버리고 이동할까요?')) return
    setTab(key)
  }

  const Form = FORM[tab]

  return (
    <div>
      <div className="topbar">
        <button type="button" className="btn-cancel" aria-label="취소" onClick={close}>✕</button>
        <button type="submit" form="record-form" className="btn-submit" aria-label="저장"></button>
      </div>
      <div className="topbg"></div>
      <SegmentTabs className="form-tabs" options={options} value={tab} onChange={handleTab} allowDeselect={false} />
      <Form key={tab} ref={formRef} mode="embedded" />
    </div>
  )
}
