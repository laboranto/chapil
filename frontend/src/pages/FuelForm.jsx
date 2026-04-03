import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

export default function FuelForm() {
  // useParams: URL의 :id 부분을 꺼낸다. 신규 입력이면 id는 undefined.
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id) // id가 있으면 수정 모드

  // form: 폼 전체 상태를 하나의 객체로 관리한다.
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], // 오늘 날짜를 기본값으로
    type: '가득주유',
    amount: '',
    unit_price: '',
    liters: '',
    odometer: '',
    memo: '',
  })

  useEffect(() => {
    if (isEdit) {
      // 수정 모드: 목록에서 해당 id의 기존 데이터를 불러와 폼에 채운다.
      api.getFuel().then(records => {
        const r = records.find(r => r.id === Number(id))
        if (r) setForm({
          date:       r.date,
          type:       r.type,
          amount:     r.amount     ?? '',
          unit_price: r.unit_price ?? '',
          liters:     r.liters     ?? '',
          odometer:   r.odometer   ?? '',
          memo:       r.memo       ?? '',
        })
      })
    } else {
      // 신규 모드: 마지막 주유 기록의 주행거리를 기본값으로 채운다.
      api.getFuel().then(records => {
        if (records.length > 0)
          setForm(f => ({ ...f, odometer: records[0].odometer }))
      })
    }
  }, [id])

  // set: 특정 필드만 바꾸는 헬퍼. 스프레드(...f)로 나머지 필드는 유지한다.
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // calc: 금액 / 단가 / 주유량 중 두 값이 있으면 나머지 하나를 자동 계산한다.
  // onBlur(입력칸에서 포커스가 떠날 때) 호출된다.
  const calc = (changed) => {
    const a = parseFloat(form.amount)
    const u = parseFloat(form.unit_price)
    const l = parseFloat(form.liters)
    if (changed === 'amount' || changed === 'unit_price') {
      if (a && u) set('liters', (a / u).toFixed(2))
    } else if (changed === 'liters') {
      if (a && l) set('unit_price', Math.round(a / l))
      else if (u && l) set('amount', Math.round(u * l))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault() // 브라우저 기본 폼 제출(페이지 새로고침)을 막는다.
    const body = {
      date:       form.date,
      type:       form.type,
      amount:     Number(form.amount),
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      liters:     form.liters     ? Number(form.liters)     : null,
      odometer:   Number(form.odometer),
      memo:       form.memo || null,
    }
    if (isEdit) await api.updateFuel(id, body)
    else        await api.createFuel(body)
    navigate('/fuel')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="topbar">
        <button type="button" className="btn-cancel" onClick={() => navigate('/fuel')}>✕</button>
        <button type="submit" className="btn-submit">✓</button>
      </div>
      <div className="topbg"></div>
      <div className="content">

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
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            onBlur={() => calc('amount')} />
        </div>

        <div className="form-group">
          <label>단가 (원/L)</label>
          <input type="number" inputMode="numeric"
            value={form.unit_price}
            onChange={e => set('unit_price', e.target.value)}
            onBlur={() => calc('unit_price')} />
        </div>

        <div className="form-group">
          <label>주유량 (L)</label>
          <input type="number" step="0.001" inputMode="decimal"
            value={form.liters}
            onChange={e => set('liters', e.target.value)}
            onBlur={() => calc('liters')} />
        </div>

        <div className="form-group">
          <label>누적 주행거리 (km)</label>
          <input type="number" inputMode="numeric" required
            value={form.odometer}
            onChange={e => set('odometer', e.target.value)} />
        </div>

        <div className="form-group">
          <label>메모</label>
          <textarea value={form.memo} onChange={e => set('memo', e.target.value)} />
        </div>

      </div>
    </form>
  )
}
