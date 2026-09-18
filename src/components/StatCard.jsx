/** Small metric tile used across the dashboard and progress tabs. */
export default function StatCard({ label, value, unit, hint, tone = 'default' }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  )
}