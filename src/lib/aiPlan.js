/**
 * AI workout-plan generation.
 *
 * The actual AI writes the weekly split: `askAiPlan()` sends the user's
 * profile plus the exercise catalogue to the configured chat completions
 * endpoint and expects raw JSON back. The response is then validated and
 * hydrated against the local exercise library before it ever reaches the UI:
 *
 *   - exercise ids must exist in the library and fit the user's level/equipment
 *   - sets / reps / rest / minutes / calories are clamped to sane ranges
 *   - day labels, weekdays, warm-up, cool-down and summary totals are computed
 *     locally so the plan always matches the shapes the components render
 *
 * Any structural problem throws AI_INVALID_PLAN:... so callers (App.jsx)
 * can fall back to the deterministic engine - the failsafe that keeps the
 * app usable when the AI is unavailable.
 */

import { EXERCISES, LEVELS, WARMUP_IDS, COOLDOWN_IDS, getExerciseById } from '../data/exercises.js'
import {
  GOALS,
  DAY_LABELS,
  scheduleDays,
  getWeekKey,
  buildWeekLabel,
  describeFocus
} from './workoutEngine.js'
import { AI_CONFIG, chatCompletion, isAiConfigured } from './aiClient.js'

/* ------------------------------------------------------------- catalogue */

/** Exercises the AI is allowed to pick: fits level + equipment. */
export const allowedExercises = (profile) => {
  const level = LEVELS[profile.level] || 2
  const bands = profile.equipment === 'bands'
  return EXERCISES.filter(
    (exercise) => exercise.level <= level && (bands || exercise.equipment === 'bodyweight')
  )
}

/* ----------------------------------------------------------------- prompt */

/** Chat messages that ask the model for a plan in the expected JSON shape. */
export const buildPlanMessages = (profile, { variant = 0 } = {}) => {
  const goal = GOALS[profile.goal] || GOALS.muscle
  const daysPerWeek = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3))
  const catalogue = allowedExercises(profile)

  const system = `You are "Coach Kai", a certified strength & conditioning coach programming home workouts with bodyweight and resistance bands.

Write a complete ${daysPerWeek}-day weekly training plan for the user below.

Respond with RAW JSON ONLY - no markdown fences, no commentary - exactly this shape:
{"days":[{"title":"Push Strength","focus":"Push · Core","minutes":45,"calories":320,"exercises":[{"id":"pushup","sets":3,"reps":10,"rest":60,"tempo":"2s down / 1s up","weightHint":"Brace hard, full lockout"}]}]}

Rules:
- Exactly ${daysPerWeek} days. 4-6 exercises per day (plus at most one conditioning finisher).
- "id" MUST be one of the ids in the catalogue the user provides. Never invent ids.
- Never repeat an id within the same day. Balance push / pull / legs / core across the week.
- "sets" 2-8, "reps" 5-20 (15-60 when the catalogue unit is "seconds"), "rest" 10-180 seconds.
- "minutes" 15-150, "calories" 50-2000 - both realistic for the session described.
- Goal is ${goal.label}: ${goal.description}
- Match difficulty to the user's level and only use equipment they own.
- Hard compound movements first, isolation and conditioning last.
- "title" and "focus" are short (max 5 words). "tempo" and "weightHint" are 3-10 words.`

  const catalogueLines = catalogue
    .map(
      (exercise) =>
        `${exercise.id} | ${exercise.name} | ${exercise.pattern} | ${exercise.unit} | ${exercise.equipment} | L${exercise.level}`
    )
    .join('\n')

  const user = `User profile:
- Goal: ${goal.label} (${goal.key})
- Level: ${profile.level}
- Days per week: ${daysPerWeek}
- Equipment: ${profile.equipment === 'bands' ? 'bodyweight + resistance bands' : 'bodyweight only'}
- Body: ${profile.weightKg} kg, ${profile.heightCm} cm, age ${profile.age}, ${profile.sex}
- Variation nonce: ${variant} (generate a fresh, distinct selection)

Exercise catalogue (id | name | pattern | unit | equipment | level):
${catalogueLines}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
}

/* ------------------------------------------------------------ validation */

const clampInt = (value, min, max, fallback) => {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const nonEmptyString = (value, max = 60) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.slice(0, max)
}

/**
 * Pulls the JSON payload out of a model reply. Tolerates markdown fences,
 * leading/trailing commentary and a bare `[...]` array of days.
 */
const extractJson = (content) => {
  const cleaned = String(content || '')
    .replace(/```(?:json)?/gi, '')
    .trim()

  const attempt = (text) => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  const direct = attempt(cleaned)
  if (Array.isArray(direct)) return { days: direct }
  if (direct && typeof direct === 'object') return direct

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('AI_BAD_JSON: no JSON object in the AI reply')

  const sliced = attempt(cleaned.slice(start, end + 1))
  if (!sliced || typeof sliced !== 'object') {
    throw new Error('AI_BAD_JSON: the AI reply was not valid JSON')
  }
  return sliced
}

/** Fallback duration when the model omits/understates minutes. */
const estimateMinutes = (entries, goalConfig) => {
  const workSeconds = entries.reduce((total, entry) => {
    const secondsPerSet = entry.unit === 'seconds' ? entry.reps : entry.reps * 3
    return total + entry.sets * (secondsPerSet + entry.rest)
  }, 0)
  const warmup = 8 * 60
  const finisher = goalConfig.cardioFinisher ? 6 * 60 : 0
  return Math.max(20, Math.round((workSeconds + warmup + finisher) / 60))
}

/** Fallback calorie estimate - same MET maths as the deterministic engine. */
const estimateCalories = ({ minutes, level, goalKey, weightKg }) => {
  const weight = Number(weightKg) > 0 ? Number(weightKg) : 70
  const met = goalKey === 'fatloss' ? 6.5 : level >= 3 ? 6 : 5
  return Math.round(((met * 3.5 * weight) / 200) * minutes)
}

/**
 * Turns raw model output into a full, render-safe plan object.
 * Throws AI_BAD_JSON / AI_INVALID_PLAN:... on structural problems.
 *
 * @param {string} content - raw assistant reply from the AI
 * @param {object} profile - the user profile (same shape as DEFAULT_PROFILE)
 * @param {object} options - { variant }
 */
export const parseAiPlan = (content, profile, { variant = 0 } = {}) => {
  const payload = extractJson(content)
  if (!payload || !Array.isArray(payload.days)) {
    throw new Error('AI_INVALID_PLAN: the AI reply has no "days" array')
  }

  const goalKey = GOALS[profile.goal] ? profile.goal : 'muscle'
  const goalConfig = GOALS[goalKey]
  const level = LEVELS[profile.level] || 2
  const daysPerWeek = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3))
  const equipment = profile.equipment === 'bands' ? 'bands' : 'bodyweight'

  if (payload.days.length !== daysPerWeek) {
    throw new Error(`AI_INVALID_PLAN: expected ${daysPerWeek} days, got ${payload.days.length}`)
  }

  const library = new Map(allowedExercises(profile).map((exercise) => [exercise.id, exercise]))
  const trainingDayIndexes = scheduleDays(daysPerWeek)

  const days = payload.days.map((dayInput, index) => {
    if (!dayInput || !Array.isArray(dayInput.exercises)) {
      throw new Error(`AI_INVALID_PLAN: day ${index + 1} has no exercises array`)
    }

    const seen = new Set()
    const entries = []

    dayInput.exercises.forEach((raw) => {
      const exercise = library.get(String(raw?.id || ''))
      if (!exercise) return // unknown / not allowed for this user - drop it
      if (seen.has(exercise.id)) return // never repeat within a day
      seen.add(exercise.id)

      const sets = clampInt(raw.sets, 2, 8, goalConfig.sets[1])
      const rest = clampInt(
        raw.rest,
        10,
        180,
        Math.round((goalConfig.restSeconds[0] + goalConfig.restSeconds[1]) / 2)
      )
      const reps =
        exercise.unit === 'seconds'
          ? clampInt(raw.reps, 15, 120, 30)
          : clampInt(raw.reps, 1, 100, goalConfig.reps[1])

      const displayReps =
        exercise.unit === 'seconds'
          ? `${reps}s`
          : exercise.unit === 'reps-per-side'
            ? `${reps} / side`
            : `${reps}`

      entries.push({
        id: exercise.id,
        name: exercise.name,
        pattern: exercise.pattern,
        muscles: exercise.muscles,
        equipment: exercise.equipment,
        unit: exercise.unit,
        sets,
        reps,
        display: `${sets} x ${displayReps}`,
        rest,
        tempo:
          nonEmptyString(raw.tempo, 60) ||
          (exercise.unit === 'seconds'
            ? 'Steady, controlled breathing'
            : level >= 3
              ? '3s down / 1s pause / explosive up'
              : '2s down / 1s up'),
        cue: exercise.cues,
        weightHint:
          nonEmptyString(raw.weightHint, 90) ||
          (exercise.equipment === 'band'
            ? goalConfig.bandTensionHint
            : 'Slow the tempo or add a loaded backpack when it feels easy'),
        ...(exercise.pattern === 'cardio' && index === payload.days.length - 1
          ? { isFinisher: true }
          : {})
      })
    })

    if (entries.length === 0) {
      throw new Error(`AI_INVALID_PLAN: day ${index + 1} has no valid exercises`)
    }

    const dayIndex = trainingDayIndexes[index]
    const minutes = clampInt(dayInput.minutes, 15, 150, estimateMinutes(entries, goalConfig))
    const calories = clampInt(
      dayInput.calories,
      50,
      2000,
      estimateCalories({ minutes, level, goalKey, weightKg: profile.weightKg })
    )

    return {
      id: `day-${index + 1}`,
      dayIndex,
      label: DAY_LABELS[dayIndex],
      title: nonEmptyString(dayInput.title, 60) || `Session ${index + 1}`,
      focus: nonEmptyString(dayInput.focus, 60) || describeFocus(entries.map((entry) => entry.pattern)),
      exercises: entries,
      minutes,
      calories
    }
  })

  const totalSets = days.reduce(
    (total, day) => total + day.exercises.reduce((sum, entry) => sum + entry.sets, 0),
    0
  )

  return {
    goal: goalKey,
    goalLabel: goalConfig.label,
    goalIcon: goalConfig.icon,
    goalDescription: goalConfig.description,
    focusNote: goalConfig.focusNote,
    level: profile.level,
    levelNumber: level,
    daysPerWeek,
    equipment,
    weekKey: getWeekKey(),
    weekLabel: buildWeekLabel(),
    variant,
    source: 'ai',
    days,
    restDays: DAY_LABELS.filter((_, index) => !trainingDayIndexes.includes(index)),
    warmup: WARMUP_IDS.map(getExerciseById).filter(Boolean).slice(0, 3),
    cooldown: COOLDOWN_IDS.map(getExerciseById).filter(Boolean),
    summary: {
      sessions: days.length,
      totalMinutes: days.reduce((total, day) => total + day.minutes, 0),
      totalCalories: days.reduce((total, day) => total + day.calories, 0),
      totalSets
    }
  }
}

/* ------------------------------------------------------------- transport */

/**
 * Asks the configured AI for a fresh weekly plan.
 * Throws AI_NOT_CONFIGURED / transport errors / AI_INVALID_PLAN:... so the
 * caller can fall back to the deterministic engine.
 *
 * @param {object} profile
 * @param {object} options - { variant } - regenerate counter, adds variation
 */
export const askAiPlan = async (profile, { variant = 0 } = {}) => {
  if (!isAiConfigured()) throw new Error('AI_NOT_CONFIGURED')

  const content = await chatCompletion({
    messages: buildPlanMessages(profile, { variant }),
    temperature: 0.8,
    maxTokens: 4000,
    timeoutMs: 30_000
  })

  return parseAiPlan(content, profile, { variant })
}

/** Model name for UI labels; empty when nothing is configured. */
export const aiPlanModel = () => (isAiConfigured() ? AI_CONFIG.model : '')

