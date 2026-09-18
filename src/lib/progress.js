/**
 * Aggregates the completion log into the numbers shown on the Progress tab.
 */

import { getWeekKey } from './workoutEngine.js'
import { calculateStreak } from './storage.js'

const MINUTES_PER_SESSION_DEFAULT = 35
const CALORIES_PER_SESSION_DEFAULT = 260

/** Last `count` week keys, oldest first. */
export const recentWeekKeys = (count = 8) => {
  const keys = []
  const now = new Date()
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(getWeekKey(new Date(now.getTime() - offset * 7 * 24 * 60 * 60 * 1000)))
  }
  return keys
}

const shortWeekLabel = (weekKey, index, total) => {
  if (index === total - 1) return 'This wk'
  return weekKey.split('-W')[1] ? `W${weekKey.split('-W')[1]}` : weekKey
}

/**
 * Builds the weekly chart data: how many sessions were completed vs planned,
 * plus an estimated calorie burn per week.
 */
export const buildHistory = ({ completions, plan, weeks = 8 }) => {
  const planned = plan?.days?.length || 3
  const avgMinutes =
    plan?.days?.length > 0
      ? Math.round(plan.summary.totalMinutes / plan.days.length)
      : MINUTES_PER_SESSION_DEFAULT
  const avgCalories =
    plan?.days?.length > 0
      ? Math.round(plan.summary.totalCalories / plan.days.length)
      : CALORIES_PER_SESSION_DEFAULT

  const keys = recentWeekKeys(weeks)

  return keys.map((weekKey, index) => {
    const completed = Object.keys(completions?.[weekKey] || {}).length
    return {
      weekKey,
      label: shortWeekLabel(weekKey, index, keys.length),
      completed,
      planned,
      percent: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0,
      minutes: completed * avgMinutes,
      calories: completed * avgCalories
    }
  })
}

/** Headline stats for the progress dashboard. */
export const buildStats = ({ completions, plan, weights }) => {
  const streak = calculateStreak(completions)
  const history = buildHistory({ completions, plan, weeks: 8 })
  const totalMinutes = history.reduce((total, week) => total + week.minutes, 0)
  const totalCalories = history.reduce((total, week) => total + week.calories, 0)
  const thisWeek = history[history.length - 1] || { completed: 0, planned: 0, percent: 0 }
  const avgPercent =
    history.length > 0
      ? Math.round(history.reduce((total, week) => total + week.percent, 0) / history.length)
      : 0

  const weightTrend = buildWeightTrend(weights)

  return {
    streakWeeks: streak.weeks,
    totalSessions: streak.sessions,
    thisWeekCompleted: thisWeek.completed,
    thisWeekPlanned: thisWeek.planned,
    thisWeekPercent: thisWeek.percent,
    consistency: avgPercent,
    totalMinutes,
    totalCalories,
    weightTrend
  }
}

/**
 * Compares the latest logged weight with the first one in the window.
 * Returns null deltas when there is not enough data.
 */
export const buildWeightTrend = (weights = []) => {
  const entries = [...(weights || [])]
    .filter((entry) => Number(entry.kg) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  if (entries.length === 0) {
    return { entries, latest: null, first: null, delta: null, message: 'Log your weight to see the trend.' }
  }

  const first = entries[0]
  const latest = entries[entries.length - 1]
  const delta = Math.round((latest.kg - first.kg) * 10) / 10

  let message = 'Keep logging weekly so the trend stays meaningful.'
  if (entries.length === 1) {
    message = 'Log again next week to see your direction of travel.'
  } else if (delta < -0.3) {
    message = `Down ${Math.abs(delta)} kg since your first entry.`
  } else if (delta > 0.3) {
    message = `Up ${delta} kg since your first entry.`
  } else {
    message = `Stable - within ${Math.abs(delta)} kg of your first entry.`
  }

  return { entries, first, latest, delta, message }
}

/** Personal-record style summaries used by the Progress tab cards. */
export const achievedMilestones = ({ completions, plan }) => {
  const stats = buildStats({ completions, plan, weights: [] })
  const milestones = []

  if (stats.totalSessions > 0) milestones.push('First workout logged')
  if (stats.totalSessions >= 10) milestones.push('10 workouts completed')
  if (stats.totalSessions >= 25) milestones.push('25 workouts completed')
  if (stats.totalSessions >= 50) milestones.push('50 workouts completed')
  if (stats.streakWeeks >= 2) milestones.push('2-week streak')
  if (stats.streakWeeks >= 4) milestones.push('4-week streak')
  if (stats.thisWeekPercent === 100) milestones.push('Perfect week')

  return milestones
}

/** Exports everything as a JSON backup file download. */
export const downloadBackup = (payload) => {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `ai-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}