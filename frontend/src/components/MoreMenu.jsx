import { useState, useEffect, useRef } from 'react'
import KebabIcon from '../assets/symbols/kebab.svg?react'

export default function MoreMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="more-menu" ref={ref}>
      <button className="btn-more" onClick={() => setOpen(o => !o)}><KebabIcon /></button>
      {open && (
        <div className="more-dropdown">
          <button onClick={() => { setOpen(false); onEdit() }}>수정</button>
          <button onClick={() => { setOpen(false); onDelete() }}>삭제</button>
        </div>
      )}
    </div>
  )
}
