import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Settings() {
  const navigate = useNavigate()
  const [carBirth, setCarBirth] = useState('')

  useEffect(() => {
    api.getSettings().then(data => setCarBirth(data.car_birth))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await api.updateSettings({ car_birth: carBirth })
    navigate('/')
  }

  return (
    <>
      <div className="topbar">
        <h1>차량 설정</h1>
        <button type="submit" form="settings-form" className="btn-submit">✓</button>
      </div>
      <div className="topbg"></div>
      <div className="content">
        <form id="settings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>차량 출고일</label>
            <input type="date" value={carBirth} onChange={e => setCarBirth(e.target.value)} />
          </div>
        </form>
      </div>
    </>
  )
}
