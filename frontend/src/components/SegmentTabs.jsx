export default function SegmentTabs({ options, value, onChange, allowDeselect = false, className = '' }) {
  const handle = (key) => {
    if (key === value) {
      if (allowDeselect) onChange(null)
      return
    }
    onChange(key)
  }
  return (
    <div className={`segment-tabs ${className}`}>
      {options.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className={'segment-tab' + (key === value ? ' active' : '')}
          onClick={() => handle(key)}
        >
          {Icon && <Icon />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
