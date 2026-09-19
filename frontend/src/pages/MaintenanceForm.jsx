import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useParams } from 'react-router-dom'
import { useClose } from '../sheet'
import { api } from '../api'
import DeleteRecord from '../components/records/DeleteRecord'

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  item: '', amount: '0', odometer: '', memo: '',
}

const MaintenanceForm = forwardRef(function MaintenanceForm({ mode = 'standalone' }, ref) {
  const { id } = useParams()
  const close = useClose()
  const isEdit = Boolean(id)

  const [items, setItems] = useState([])
  const [form, setForm] = useState(BLANK)
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    // 항목 목록과 기존 데이터를 병렬로 불러온다.
    // Promise.all: 여러 비동기 작업을 동시에 실행하고, 전부 완료되면 결과를 배열로 반환한다.
    Promise.all([
      api.getMaintenanceItems(),
      isEdit ? api.getMaintenance() : Promise.resolve(null),
      api.getFuel(),
    ]).then(([itemList, records, fuelRecords]) => {
      setItems(itemList)

      let next
      if (isEdit && records) {
        const r = records.find(r => r.id === Number(id))
        next = r ? {
          date:     r.date,
          item:     r.item,
          amount:   r.amount   ?? '0',
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
      amount:   Number(form.amount),
      odometer: Number(form.odometer),
      memo:     form.memo || null,
    }
    if (isEdit) await api.updateMaintenance(id, body)
    else        await api.createMaintenance(body)
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

        {isEdit && <DeleteRecord onDelete={() => api.deleteMaintenance(id)} />}

      </div>
    </form>
  )
})

export default MaintenanceForm
