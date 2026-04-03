import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

export default function MaintenanceForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    date:      new Date().toISOString().split('T')[0],
    item:      '',
    amount:    '0',
    odometer:  '',
    memo:      '',
  })

  useEffect(() => {
    // 항목 목록과 기존 데이터를 병렬로 불러온다.
    // Promise.all: 여러 비동기 작업을 동시에 실행하고, 전부 완료되면 결과를 배열로 반환한다.
    Promise.all([
      api.getMaintenanceItems(),
      isEdit ? api.getMaintenance() : Promise.resolve(null),
      api.getFuel(),
    ]).then(([itemList, records, fuelRecords]) => {
      setItems(itemList)
      setForm(f => ({ ...f, item: itemList[0] ?? '' }))

      if (isEdit && records) {
        const r = records.find(r => r.id === Number(id))
        if (r) setForm({
          date:     r.date,
          item:     r.item,
          amount:   r.amount   ?? '0',
          odometer: r.odometer ?? '',
          memo:     r.memo     ?? '',
        })
      } else if (fuelRecords.length > 0) {
        setForm(f => ({ ...f, odometer: fuelRecords[0].odometer }))
      }
    })
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const body = {
      date:     form.date,
      item:     form.item,
      amount:   Number(form.amount),
      odometer: Number(form.odometer),
      memo:     form.memo || null,
    }
    if (isEdit) await api.updateMaintenance(id, body)
    else        await api.createMaintenance(body)
    navigate('/maintenance')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="topbar">
        <button type="button" className="btn-cancel" onClick={() => navigate('/maintenance')}>✕</button>
        <button type="submit" className="btn-submit">✓</button>
      </div>
      <div className="topbg"></div>
      <div className="content">

        <div className="form-group">
          <label>날짜</label>
          <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <div className="form-group">
          <label>항목</label>
          <div className="select-wrap">
            <select value={form.item} onChange={e => set('item', e.target.value)}>
              {items.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>금액 (원, 없으면 0)</label>
          <input type="number" inputMode="numeric"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>

        <div className="form-group">
          <label>누적 주행거리 (km)</label>
          <input type="number" inputMode="numeric" required
            value={form.odometer} onChange={e => set('odometer', e.target.value)} />
        </div>

        <div className="form-group">
          <label>메모</label>
          <textarea value={form.memo} onChange={e => set('memo', e.target.value)} />
        </div>

      </div>
    </form>
  )
}
