import { useMemo } from 'react'
import DayCard from './DayCard.jsx'
import StatCard from './StatCard.jsx'
import { buildStats } from '../lib/progress.js'
import { todayIndex } from '../lib/workoutEngine.js'

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({
  profile,
  plan,
  nutrition,
  completions,
  weekKey,
  weights,
  onTabChange,
  onToggleDay,
  onRegenerate
}) {
  const stats = useMemo(
    () => buildStats({ completions, plan, weights }),
    [completions, plan, weights]
  )

  const today = todayIndex()
  const todaysDay = plan?.days?.find((day) => day.dayIndex === today) || plan?.days?.[0]
  const todaysDone = todaysDay ? Boolean(completions?.[weekKey]?.[todaysDay.id]) : false

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">
            {plan?.weekLabel} · Week plan generated for {plan?.goalLabel}
          </p>
          <h1>
            {greeting()}
            {profile.name ? `, ${profile.name}` : ''} 👋
          </h1>
          <p className="hero__sub">
            {plan?.focusNote} You train {plan?.daysPerWeek} days per week with{' '}
            {plan?.equipment === 'bands' ? 'bodyweight and resistance bands' : 'bodyweight only'}.
          </p>

          <div className="hero__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => onTabChange('workout')}
            >
              Open this week&apos;s plan
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onTabChange('coach')}
            >
               Ask the coach
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={onRegenerate}
              title="Generate a fresh selection of exercises for this week"
            >
              ↻ Regenerate plan
            </button>
          </div>
        </div>

        <div className="hero__ring" role="img" aria-label={`${stats.thisWeekPercent}% of this week completed`}>
          <svg viewBox="0 0 120 120">
            <circle className="ring__track" cx="60" cy="60" r="52" />
            <circle
              className="ring__value"
              cx="60"
              cy="60"
              r="52"
              strokeDasharray={`${(stats.thisWeekPercent / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
            />
          </svg>
          <div className="hero__ring-text">
            <strong>{stats.thisWeekPercent}%</strong>
            <span>
              {stats.thisWeekCompleted}/{stats.thisWeekPlanned} sessions
            </span>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard
          label="This week"
          value={stats.thisWeekCompleted}
          unit={`/${stats.thisWeekPlanned}`}
          hint="Workouts completed"
          tone="positive"
        />
        <StatCard
          label="Calorie target"
          value={nutrition?.calories ?? '—'}
          unit="kcal"
          hint={`TDEE ${nutrition?.tdee ?? '—'} kcal`}
        />
        <StatCard
          label="Protein target"
          value={nutrition?.macros?.protein ?? '—'}
          unit="g"
          hint={`${nutrition?.proteinPerKg ?? '—'} g per kg body weight`}
        />
        <StatCard
          label="Current streak"
          value={stats.streakWeeks}
          unit={stats.streakWeeks === 1 ? 'week' : 'weeks'}
          hint={`${stats.totalSessions} sessions logged in total`}
          tone="positive"
        />
      </section>

      <section className="panel-grid">
        <div className="panel panel--wide">
          <div className="panel__head">
            <h2>Your next workout</h2>
            <span className="panel__sub">
              {todaysDone ? 'Already logged for today - nice work!' : 'Tap an exercise row to expand'}
            </span>
          </div>

          {todaysDay ? (
            <DayCard
              day={todaysDay}
              isComplete={todaysDone}
              isToday={todaysDay.dayIndex === today}
              onToggle={onToggleDay}
              defaultOpen
              showWarmup
              warmup={plan?.warmup || []}
            />
          ) : (
            <p className="empty">Generating your plan…</p>
          )}

          {plan?.cooldown?.length > 0 && (
            <div className="cooldown-strip">
              <strong>Cool-down</strong>
              <span>{plan.cooldown.map((item) => item.name).join(' · ')}</span>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2>Week at a glance</h2>
            <span className="panel__sub">
              Total {plan?.summary?.totalMinutes ?? 0} min · {plan?.summary?.totalSets ?? 0} sets
            </span>
          </div>

          <ul className="schedule">
            {plan?.days?.map((day) => {
              const done = Boolean(completions?.[weekKey]?.[day.id])
              return (
                <li key={day.id} className={`schedule__row${done ? ' schedule__row--done' : ''}`}>
                  <span className="schedule__day">{day.label.slice(0, 3)}</span>
                  <span className="schedule__title">{day.title}</span>
                  <span className="schedule__status">{done ? '✓' : day.minutes + ' min'}</span>
                </li>
              )
            })}
            {plan?.restDays?.map((restDay) => (
              <li key={restDay} className="schedule__row schedule__row--rest">
                <span className="schedule__day">{restDay.slice(0, 3)}</span>
                <span className="schedule__title">Rest / walk / mobility</span>
                <span className="schedule__status">—</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Today&apos;s nutrition focus</h2>
          <span className="panel__sub">{nutrition?.note}</span>
        </div>
        <div className="macro-row">
          <div className="macro">
            <span className="macro__value">{nutrition?.calories}</span>
            <span className="macro__label">kcal</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition?.macros?.protein} g</span>
            <span className="macro__label">Protein</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition?.macros?.carbs} g</span>
            <span className="macro__label">Carbs</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition?.macros?.fat} g</span>
            <span className="macro__label">Fat</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition?.waterLitres} L</span>
            <span className="macro__label">Water</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition?.stepTarget}</span>
            <span className="macro__label">Steps</span>
          </div>
        </div>
      </section>
    </div>
  )
}