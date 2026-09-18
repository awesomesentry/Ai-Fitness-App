import { useState } from 'react'

const EQUIPMENT_LABEL = {
  bodyweight: 'Bodyweight',
  band: 'Band'
}

/**
 * A single training day: header, expandable exercise list and a completion
 * toggle. Used on both the dashboard and the workout plan tab.
 */
export default function DayCard({
  day,
  isComplete,
  isToday,
  onToggle,
  defaultOpen = false,
  showWarmup = false,
  warmup = []
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <article className={`day-card${isComplete ? ' day-card--done' : ''}`}>
      <div className="day-card__header">
        <button
          type="button"
          className="day-card__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="day-card__day">
            {day.label}
            {isToday && <span className="tag tag--today">Today</span>}
          </span>
          <span className="day-card__title">{day.title}</span>
          <span className="day-card__meta">
            {day.focus} · {day.minutes} min · ~{day.calories} kcal
          </span>
          <span className="day-card__chevron" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        </button>

        <button
          type="button"
          className={`check-button${isComplete ? ' check-button--done' : ''}`}
          onClick={() => onToggle(day.id, !isComplete)}
          aria-pressed={isComplete}
        >
          {isComplete ? '✓ Completed' : 'Mark done'}
        </button>
      </div>

      {open && (
        <div className="day-card__body">
          {showWarmup && warmup.length > 0 && (
            <div className="warmup-strip">
              <strong>Warm-up (5 min)</strong>
              <span>{warmup.map((item) => item.name).join(' · ')}</span>
            </div>
          )}

          <div className="exercise-list">
            {day.exercises.map((exercise, index) => (
              <div
                key={`${day.id}-${exercise.id}-${index}`}
                className={`exercise${exercise.isFinisher ? ' exercise--finisher' : ''}`}
              >
                <div className="exercise__index">{index + 1}</div>
                <div className="exercise__main">
                  <div className="exercise__name">
                    {exercise.name}
                    {exercise.isFinisher && <span className="tag tag--finisher">Finisher</span>}
                  </div>
                  <div className="exercise__muscles">{exercise.muscles.join(' · ')}</div>
                  <div className="exercise__cue">{exercise.cue}</div>
                  <div className="exercise__weight">{exercise.weightHint}</div>
                </div>
                <div className="exercise__stats">
                  <span className="exercise__display">{exercise.display}</span>
                  <span className="exercise__rest">{exercise.rest}s rest</span>
                  <span className="exercise__equip">
                    {EQUIPMENT_LABEL[exercise.equipment] || exercise.equipment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}