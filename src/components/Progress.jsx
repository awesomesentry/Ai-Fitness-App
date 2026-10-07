import { useMemo, useState } from 'react'
import StatCard from './StatCard.jsx'
import {
  achievedMilestones,
  buildHistory,
  buildStats,
  downloadBackup
} from '../lib/progress.js'
import { addWeightEntry, formatShortDate } from '../lib/storage.js'
import { describeProfile } from '../lib/workoutEngine.js'

export default function Progress({
  profile,
  plan,
  nutrition,
  completions,
  weekKey,
  weights,
  chat,
  onWeightChange,
  onResetAll
}) {
  const [weightInput, setWeightInput] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const history = useMemo(() => buildHistory({ completions, plan, weeks: 8 }), [completions, plan])
  const stats = useMemo(
    () => buildStats({ completions, plan, weights }),
    [completions, plan, weights]
  )
  const milestones = useMemo(
    () => achievedMilestones({ completions, plan }),
    [completions, plan]
  )

  const trend = stats.weightTrend
  const maxCompleted = Math.max(1, ...history.map((week) => Math.max(week.completed, week.planned)))
  const maxWeight = Math.max(...(trend.entries || []).map((entry) => entry.kg), 1)
  const minWeight = Math.min(...(trend.entries || []).map((entry) => entry.kg), maxWeight)

  const handleLogWeight = (event) => {
    event.preventDefault()
    const value = Number(weightInput)
    if (!Number.isFinite(value) || value <= 0) return
    onWeightChange(addWeightEntry(weights, value))
    setWeightInput('')
  }

  const handleExport = () => {
    downloadBackup({
      exportedAt: new Date().toISOString(),
      profile,
      plan,
      nutrition,
      completions,
      weights,
      chat
    })
  }

  return (
    <div className="page">
      <section className="panel panel--flush">
        <div className="plan-header">
          <div>
            <p className="hero__eyebrow">Progress tracking · {describeProfile(profile)}</p>
            <h1>Your consistency report</h1>
            <p className="hero__sub">
              Session completions are stored in your browser, so you can close the app and come back
              to it any time.
            </p>
          </div>
          <div className="plan-header__actions">
            <button type="button" className="button button--ghost" onClick={handleExport}>
               Export data
            </button>
          </div>
        </div>

        <div className="stat-grid stat-grid--compact">
          <StatCard
            label="This week"
            value={stats.thisWeekCompleted}
            unit={`/${stats.thisWeekPlanned}`}
            hint={`${stats.thisWeekPercent}% of the plan`}
            tone="positive"
          />
          <StatCard
            label="Total sessions"
            value={stats.totalSessions}
            hint="All time"
          />
          <StatCard
            label="Streak"
            value={stats.streakWeeks}
            unit={stats.streakWeeks === 1 ? 'week' : 'weeks'}
            hint={`${stats.consistency}% average weekly completion`}
          />
          <StatCard
            label="Estimated burn"
            value={stats.totalCalories}
            unit="kcal"
            hint={`${stats.totalMinutes} training minutes logged`}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Weekly consistency</h2>
          <span className="panel__sub">Completed vs planned sessions, last 8 weeks</span>
        </div>

        <div className="chart">
          {history.map((week) => (
            <div key={week.weekKey} className="chart__column">
              <span className="chart__value">
                {week.completed}/{week.planned}
              </span>
              <div className="chart__bar-track">
                <div
                  className="chart__bar"
                  style={{ height: `${Math.round((week.completed / maxCompleted) * 100)}%` }}
                  title={`${week.completed} of ${week.planned} sessions`}
                />
                <div
                  className="chart__bar-target"
                  style={{ bottom: `${Math.round((week.planned / maxCompleted) * 100)}%` }}
                  title={`Target: ${week.planned} sessions`}
                />
              </div>
              <span className="chart__label">{week.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-grid">
        <div className="panel">
          <div className="panel__head">
            <h2>Body weight</h2>
            <span className="panel__sub">{trend.message}</span>
          </div>

          <form className="weight-form" onSubmit={handleLogWeight}>
            <label className="input-field">
              <span>Today&apos;s weight (kg)</span>
              <input
                type="number"
                min="25"
                max="300"
                step="0.1"
                value={weightInput}
                placeholder={profile.weightKg ? String(profile.weightKg) : '75'}
                onChange={(event) => setWeightInput(event.target.value)}
              />
            </label>
            <button type="submit" className="button button--primary">
              Log weight
            </button>
          </form>

          {trend.entries.length > 0 ? (
            <>
              <div className="weight-chart">
                {trend.entries.map((entry) => (
                  <div key={entry.date} className="weight-chart__point">
                    <div
                      className="weight-chart__dot"
                      style={{
                        bottom: `${Math.round(
                          ((entry.kg - minWeight) / Math.max(1, maxWeight - minWeight)) * 80 + 10
                        )}%`
                      }}
                      title={`${entry.kg} kg on ${entry.date}`}
                    />
                    <span className="weight-chart__date">{formatShortDate(entry.date)}</span>
                  </div>
                ))}
              </div>

              <ul className="entry-list">
                {trend.entries
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((entry) => (
                    <li key={entry.date}>
                      <span>{formatShortDate(entry.date)}</span>
                      <strong>{entry.kg} kg</strong>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="empty">
              Log your weight weekly. Weigh yourself in the morning, after the toilet, before
              eating, and use the weekly average to judge progress.
            </p>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2>Milestones</h2>
            <span className="panel__sub">
              {milestones.length > 0 ? `${milestones.length} unlocked` : 'Nothing yet - start logging'}
            </span>
          </div>

          {milestones.length > 0 ? (
            <ul className="badge-list">
              {milestones.map((milestone) => (
                <li key={milestone} className="badge">
                  🏅 {milestone}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              Complete a workout on the dashboard and your first milestone appears here.
            </p>
          )}

          <div className="danger-zone">
            <h3>Data &amp; reset</h3>
            <p>
              All data lives in this browser only. Export a backup before clearing your browser
              storage, or reset everything below.
            </p>
            {confirmReset ? (
              <div className="danger-zone__confirm">
                <button type="button" className="button button--danger" onClick={onResetAll}>
                  Yes, delete everything
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setConfirmReset(true)}
              >
                Reset all data
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}