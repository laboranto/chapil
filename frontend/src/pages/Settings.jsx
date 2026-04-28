import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSettings } from '../context/SettingsContext'
// 버튼 아이콘(심볼) svg 이식
import DownloadIcon        from '../assets/symbols/download.svg?react'
import UploadIcon        from '../assets/symbols/upload.svg?react'

export default function Settings() {
  const navigate = useNavigate()
  const { refreshSettings } = useSettings()
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
    await refreshSettings()
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

          <div className="section-header">차량 정보</div>

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
            <label>차량번호</label>
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
            <label>연료</label>
            <select value={form.car_fuel} onChange={set('car_fuel')}>
              <option value="">선택 안 함</option>
              {options.car_fuel.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>

        </form>

        <div className="section-header">데이터 관리</div>
        <div className="section-advice">
        <p>차필에서 작성하신 데이터는 사용자의 기기 내부에 저장되며, 어디에도 전송되지 않습니다. 사용자께서 주기적으로 '데이터 내보내기'를 통하여 개인 드라이브, 클라우드 등 안전한 장소에 백업(보관)하실 것을 권장 드립니다.</p>
        <p>또한 앱에서 자체 백업을 진행하고 있습니다. 자동 백업 경로는 다음과 같습니다.</p>
        <p className="prompt">(앱 설치 경로)/backups/chapil_backup_(날짜).json</p>
        </div>
        <div className="set-migrate">
          <button className="btn" onClick={() => navigate('/import')}>
            <DownloadIcon/>데이터 가져오기
          </button>
          <a className="btn" href={api.exportUrl()} download="chapil_export.json">
            <UploadIcon/>데이터 내보내기
          </a>
        </div>

      </div>
    </>
  )
}
