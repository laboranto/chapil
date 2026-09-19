import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useParams } from 'react-router-dom'
import { useClose } from '../sheet'
import { api } from '../api'
import DeleteRecord from '../components/records/DeleteRecord'

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  item: '', amount: '', odometer: '', memo: '',
}

const OtherForm = forwardRef(function OtherForm({ mode = 'standalone' }, ref) {
  const { id } = useParams()
  const close = useClose()
  const isEdit = Boolean(id)

  const [items, setItems] = useState([])
  const [form, setForm] = useState(BLANK)
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getOtherItems(),
      isEdit ? api.getOther() : Promise.resolve(null),
      api.getFuel(),
    ]).then(([itemList, records, fuelRecords]) => {
      setItems(itemList)

      let next
      if (isEdit && records) {
        const r = records.find(r => r.id === Number(id))
        next = r ? {
          date:     r.date,
          item:     r.item,
          amount:   r.amount   ?? '',
          odometer: r.odometer ?? '',
          memo:     r.memo     ?? '',
        } : { ...BLANK, item: itemList[0] ?? '' }
      } else {
        next = {
          ...BLANK,
          item: itemList[0] ?? '',
          odometer: fuelRecords.length > 0 ? fuelRecords[0].odometer : '',
        }
      }
      setForm(next); setInitial(next)
    })
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const doSubmit = async () => {
    const body = {
      date:     form.date,
      item:     form.item,
      amount:   form.amount   ? Number(form.amount)   : 0,
      odometer: form.odometer ? Number(form.odometer) : null,
      memo:     form.memo || null,
    }
    if (isEdit) await api.updateOther(id, body)
    else        await api.createOther(body)
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

        {isEdit && <DeleteRecord onDelete={() => api.deleteOther(id)} />}

      </div>
    </form>
  )
})

export default OtherForm
