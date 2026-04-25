import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Settings() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    car_birth: '',
    car_type: '',
    car_brand: '',
    car_model: '',
    car_plate: '',
    car_fuel: '',
  })
  const [options, setOptions] = useState({ car_type: [], car_fuel: [] })

  useEffect(() => {
    Promise.all([api.getSettings(), api.getSettingsOptions()]).then(
      ([settings, opts]) => {
        setForm(settings)
        setOptions(opts)
      }
    )
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await api.updateSettings(form)
    navigate('/')
  }

  return (
    <>
      <div className="topbar">
        <h1>설정</h1>
        <button type="submit" form="settings-form" className="btn-submit">✓</button>
      </div>
      <div className="topbg"></div>
      <div className="content">
        <form id="settings-form" onSubmit={handleSubmit}>

          <div className="section-title">차량 정보</div>

          <div className="form-group">
            <label>차종</label>
            <select value={form.car_type} onChange={set('car_type')}>
              <option value="">선택 안 함</option>
              {options.car_type.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>브랜드</label>
            <input
              type="text"
              value={form.car_brand}
              onChange={set('car_brand')}
              placeholder="예: 현대, 기아, BMW"
            />
          </div>

          <div className="form-group">
            <label>차량 이름</label>
            <input
              type="text"
              value={form.car_model}
              onChange={set('car_model')}
              placeholder="예: 아반떼, 코나, 아이오닉5"
            />
          </div>

          <div className="form-group">
            <label>차량등록번호</label>
            <input
              type="text"
              value={form.car_plate}
              onChange={set('car_plate')}
              placeholder="예: 123가4567"
            />
          </div>

          <div className="form-group">
            <label>출고일자</label>
            <input
              type="date"
              value={form.car_birth}
              onChange={set('car_birth')}
            />
          </div>

          <div className="form-group">
            <label>연료 종류</label>
            <select value={form.car_fuel} onChange={set('car_fuel')}>
              <option value="">선택 안 함</option>
              {options.car_fuel.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>

        </form>

        <div className="section-title">데이터 관리</div>

        <div className="data-actions">
          <button className="btn-action" onClick={() => navigate('/import')}>
            데이터 가져오기
          </button>
          <a className="btn-action" href={api.exportUrl()} download="chapil_export.json">
            데이터 내보내기
          </a>
        </div>

      </div>
    </>
  )
}
