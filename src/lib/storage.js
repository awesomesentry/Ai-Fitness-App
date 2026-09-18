/**
 * Tiny localStorage wrapper.
 *
 * Everything the app remembers lives under the `aifit:` namespace so it is easy
 * to inspect or clear from the browser dev tools.
 */

export const STORAGE_KEYS = {
  profile: 'aifit:profile',
  plan: 'aifit:plan',
  completions: 'aifit:completions',
  weights: 'aifit:weights',
  coach: 'aifit:coach-chat'
}

export const safeParse = (rawValue, fallback) => {
  if (rawValue === null || rawValue === undefined) return fallback
  try {
    const parsed = JSON.parse(rawValue)
    return parsed === null || parsed === undefined ? fallback : parsed
  } catch {
    return fallback
  }
}

export const loadValue = (key, fallback) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  try {
    return safeParse(window.localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

export const saveValue = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded or storage disabled (private mode) - fail silently.
    return false
  }
}

export const removeValue = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore - nothing we can do if storage is blocked.
  }
}

/** Wipes every key the app owns (used by the "reset all data" button). */
export const clearAppStorage = () => {
  Object.values(STORAGE_KEYS).forEach(removeValue)
}

/* --------------------------------------------------------- completions API */

/** Completion log shape: { [weekKey]: { [dayId]: ISOString } } */
export const isDayComplete = (completions, weekKey, dayId) =>
  Boolean(completions?.[weekKey]?.[dayId])

export const countWeekCompletions = (completions, weekKey) =>
  Object.keys(completions?.[weekKey] || {}).length

export const markDayComplete = (completions, weekKey, dayId, completed = true) => {
  const next = { ...(completions || {}) }
  const week = { ...(next[weekKey] || {}) }

  if (completed) {
    week[dayId] = new Date().toISOString()
  } else {
    delete week[dayId]
  }

  if (Object.keys(week).length === 0) {
    delete next[weekKey]
  } else {
    next[weekKey] = week
  }
  return next
}

/** Consecutive weeks (ending with the current one) that have at least one session. */
export const calculateStreak = (completions) => {
  const weeks = Object.keys(completions || {})
    .filter((weekKey) => Object.keys(completions[weekKey] || {}).length > 0)
    .sort()

  if (weeks.length === 0) return { weeks: 0, sessions: 0 }

  let streak = 0
  let cursor = new Date()
  // Walk backwards week by week while the week still has completions.
  const weekHasSessions = (date) => weeks.includes(weekKeyFor(date))

  while (weekHasSessions(cursor)) {
    streak += 1
    cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  const sessions = Object.values(completions).reduce(
    (total, week) => total + Object.keys(week || {}).length,
    0
  )

  return { weeks: streak, sessions }
}

/** Local (non-exported helper) duplicate of the engine week key to avoid a cycle. */
const weekKeyFor = (date) => {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const dayFromMonday = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayFromMonday + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3)
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`
}

/* ----------------------------------------------------------- weight logging */

/** Weight entries are stored newest-first: [{ date, kg }] */
export const addWeightEntry = (entries, kg) => {
  const value = Number(kg)
  if (!Number.isFinite(value) || value <= 0) return entries || []

  const today = new Date().toISOString().slice(0, 10)
  const withoutToday = (entries || []).filter((entry) => entry.date !== today)
  return [{ date: today, kg: Math.round(value * 10) / 10 }, ...withoutToday].slice(0, 60)
}

export const formatShortDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
