import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

export default function OtherForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    date:     new Date().toISOString().split('T')[0],
    item:     '',
    amount:   '',
    odometer: '',
    memo:     '',
  })

  useEffect(() => {
    Promise.all([
      api.getOtherItems(),
      isEdit ? api.getOther() : Promise.resolve(null),
      api.getFuel(),
    ]).then(([itemList, records, fuelRecords]) => {
      setItems(itemList)
      setForm(f => ({ ...f, item: itemList[0] ?? '' }))

      if (isEdit && records) {
        const r = records.find(r => r.id === Number(id))
        if (r) setForm({
          date:     r.date,
          item:     r.item,
          amount:   r.amount   ?? '',
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
      amount:   form.amount   ? Number(form.amount)   : 0,
      odometer: form.odometer ? Number(form.odometer) : null,
      memo:     form.memo || null,
    }
    if (isEdit) await api.updateOther(id, body)
    else        await api.createOther(body)
    navigate('/other')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="topbar">
        <button type="button" className="btn-cancel" onClick={() => navigate('/other')}>✕</button>
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
          <label>금액 (원)</label>
          <input type="number" inputMode="numeric"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>

        <div className="form-group">
          <label>누적 주행거리 (km, 선택)</label>
          <input type="number" inputMode="numeric"
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
