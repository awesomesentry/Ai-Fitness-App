import { useMemo, useState } from 'react'
import DayCard from './DayCard.jsx'
import StatCard from './StatCard.jsx'
import { EXERCISES, LEVELS, PATTERNS } from '../data/exercises.js'
import { todayIndex } from '../lib/workoutEngine.js'

const FILTERS = [
  { id: 'all', label: 'All patterns' },
  { id: 'push', label: PATTERNS.push },
  { id: 'pull', label: PATTERNS.pull },
  { id: 'squat', label: PATTERNS.squat },
  { id: 'hinge', label: PATTERNS.hinge },
  { id: 'lunge', label: PATTERNS.lunge },
  { id: 'core', label: PATTERNS.core },
  { id: 'cardio', label: PATTERNS.cardio },
  { id: 'mobility', label: PATTERNS.mobility }
]

export default function WorkoutPlan({
  profile,
  plan,
  completions,
  weekKey,
  onToggleDay,
  onRegenerate,
  planLoading,
  planNotice
}) {
  const [patternFilter, setPatternFilter] = useState('all')
  const [showLibrary, setShowLibrary] = useState(false)

  const today = todayIndex()
  const levelNumber = LEVELS[profile.level] || 2

  const library = useMemo(
    () =>
      EXERCISES.filter((exercise) => {
        if (exercise.level > levelNumber) return false
        if (plan?.equipment !== 'bands' && exercise.equipment === 'band') return false
        if (patternFilter !== 'all' && exercise.pattern !== patternFilter) return false
        return true
      }),
    [levelNumber, plan?.equipment, patternFilter]
  )

  return (
    <div className="page">
      <section className="panel panel--flush">
        <div className="plan-header">
          <div>
            <p className="hero__eyebrow">
              {plan?.weekLabel} · {plan?.goalLabel} · {plan?.level}
              {plan?.source === 'ai' ? ' · ✨ written by the AI' : ' · ⚙️ built-in generator'}
            </p>
            <h1>Your AI weekly plan</h1>
            <p className="hero__sub">
              {plan?.goalDescription} Every session starts with a 5-minute warm-up and finishes with
              the cool-down listed at the bottom of this page.
            </p>

            {planLoading && (
              <p className="alert alert--info">Your AI coach is writing this week&apos;s plan…</p>
            )}
            {planNotice && <p className={`alert alert--${planNotice.tone}`}>{planNotice.text}</p>}
          </div>
          <div className="plan-header__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={onRegenerate}
              disabled={planLoading}
              title="Keeps your settings, reshuffles the exercise selection"
            >
              ↻ New variation
            </button>
          </div>
        </div>

        <div className="stat-grid stat-grid--compact">
          <StatCard label="Sessions" value={plan?.summary?.sessions ?? 0} unit="/ week" />
          <StatCard label="Weekly volume" value={plan?.summary?.totalSets ?? 0} unit="sets" />
          <StatCard label="Training time" value={plan?.summary?.totalMinutes ?? 0} unit="min" />
          <StatCard
            label="Est. burn"
            value={plan?.summary?.totalCalories ?? 0}
            unit="kcal"
            tone="positive"
          />
        </div>
      </section>

      <section className="day-stack">
        {plan?.days?.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            isComplete={Boolean(completions?.[weekKey]?.[day.id])}
            isToday={day.dayIndex === today}
            onToggle={onToggleDay}
            defaultOpen={day.dayIndex === today}
            showWarmup
            warmup={plan?.warmup || []}
          />
        ))}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Warm-up &amp; cool-down</h2>
          <span className="panel__sub">Do these every session - they are not optional</span>
        </div>
        <div className="two-col">
          <div className="info-block">
            <h3>Warm-up (5 min)</h3>
            <ul className="bullet-list">
              {plan?.warmup?.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> - {item.cues}
                </li>
              ))}
            </ul>
          </div>
          <div className="info-block">
            <h3>Cool-down (3-5 min)</h3>
            <ul className="bullet-list">
              {plan?.cooldown?.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> - {item.cues}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Exercise library</h2>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => setShowLibrary((value) => !value)}
          >
            {showLibrary ? 'Hide' : `Show ${library.length} exercises`}
          </button>
        </div>

        {showLibrary && (
          <>
            <div className="chip-row chip-row--wrap">
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  className={`chip${patternFilter === filter.id ? ' chip--active' : ''}`}
                  onClick={() => setPatternFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="library">
              {library.length === 0 && (
                <p className="empty">
                  No exercises match this filter with your current equipment. Switch to
                  {' '}bodyweight + bands or change the filter.
                </p>
              )}

              {library.map((exercise) => (
                <div key={exercise.id} className="library__item">
                  <div className="library__head">
                    <strong>{exercise.name}</strong>
                    <span className={`tag tag--${exercise.equipment}`}>
                      {exercise.equipment === 'band' ? 'Band' : 'Bodyweight'}
                    </span>
                  </div>
                  <span className="library__muscles">{exercise.muscles.join(' · ')}</span>
                  <p className="library__cue">{exercise.cues}</p>
                  <span className="library__level">
                    Level: {['', 'Beginner', 'Intermediate', 'Advanced'][exercise.level]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}