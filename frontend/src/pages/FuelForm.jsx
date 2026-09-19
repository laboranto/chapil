import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useParams } from 'react-router-dom'
import { useClose } from '../sheet'
import { api } from '../api'
import DeleteRecord from '../components/records/DeleteRecord'

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  type: '가득주유', amount: '', unit_price: '', liters: '', odometer: '', memo: '',
}

const FuelForm = forwardRef(function FuelForm({ mode = 'standalone' }, ref) {
  const { id } = useParams()
  const close = useClose()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(BLANK)
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    if (isEdit) {
      api.getFuel().then(records => {
        const r = records.find(r => r.id === Number(id))
        if (r) {
          const next = {
            date: r.date, type: r.type,
            amount: r.amount ?? '', unit_price: r.unit_price ?? '',
            liters: r.liters ?? '', odometer: r.odometer ?? '', memo: r.memo ?? '',
          }
          setForm(next); setInitial(next)
        }
      })
    } else {
      api.getFuel().then(records => {
        const next = records.length > 0 ? { ...BLANK, odometer: records[0].odometer } : BLANK
        setForm(next); setInitial(next)
      })
    }
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const calc = (changed) => {
    const a = parseFloat(form.amount), u = parseFloat(form.unit_price), l = parseFloat(form.liters)
    if (changed === 'amount' || changed === 'unit_price') { if (a && u) set('liters', (a / u).toFixed(2)) }
    else if (changed === 'liters') {
      if (a && l) set('unit_price', Math.round(a / l))
      else if (u && l) set('amount', Math.round(u * l))
    }
  }

  const doSubmit = async () => {
    const body = {
      date: form.date, type: form.type, amount: Number(form.amount),
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      liters: form.liters ? Number(form.liters) : null,
      odometer: Number(form.odometer), memo: form.memo || null,
    }
    if (isEdit) await api.updateFuel(id, body)
    else await api.createFuel(body)
    close()
  }

  useImperativeHandle(ref, () => ({
    isDirty: () => initial != null && JSON.stringify(form) !== JSON.stringify(initial),
  }))

  const handleSubmit = (e) => { e.preventDefault(); doSubmit() }

  return (
    <form id={mode === 'embedded' ? 'record-form' : undefined} onSubmit={handleSubmit}>
      {mode === 'standalone' && (
        <>
          <div className="topbar">
            <button type="button" className="btn-cancel" aria-label="취소" onClick={close}>✕</button>
            <button type="submit" className="btn-submit" aria-label="저장"></button>
          </div>
          <div className="topbg"></div>
        </>
      )}
      <div className={mode === 'standalone' ? 'content' : 'content no-topbar'}>

        <div className="form-group">
          <label>날짜</label>
          <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <div className="form-group">
          <label>구분</label>
          <div className="select-wrap">
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option>가득주유</option>
              <option>부분주유</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>금액 (원)</label>
          <input type="number" inputMode="numeric" required
            value={form.amount} onChange={e => set('amount', e.target.value)} onBlur={() => calc('amount')} />
        </div>

        <div className="form-group">
          <label>단가 (원/L)</label>
          <input type="number" inputMode="numeric"
            value={form.unit_price} onChange={e => set('unit_price', e.target.value)} onBlur={() => calc('unit_price')} />
        </div>

        <div className="form-group">
          <label>주유량 (L)</label>
          <input type="number" step="0.001" inputMode="decimal"
            value={form.liters} onChange={e => set('liters', e.target.value)} onBlur={() => calc('liters')} />
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

        {isEdit && <DeleteRecord onDelete={() => api.deleteFuel(id)} />}

      </div>
    </form>
  )
})

export default FuelForm
