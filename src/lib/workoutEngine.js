import { EXERCISES, LEVELS, WARMUP_IDS, COOLDOWN_IDS, getExerciseById } from '../data/exercises.js'

/**
 * Deterministic "AI" workout generator.
 *
 * The engine picks a weekly split from the number of available days, then fills
 * every training day with exercises that match the user's level, equipment and
 * goal. A seeded shuffle keeps a plan stable for a given profile + week while
 * still rotating the exercise selection over time.
 */

export const GOALS = {
  muscle: {
    key: 'muscle',
    label: 'Build Muscle',
    icon: '💪',
    description: 'Hypertrophy focus: moderate reps, more sets, longer rest.',
    sets: [3, 4],
    reps: [8, 12],
    restSeconds: [60, 90],
    bandTensionHint: 'Use a band tension where the last 2 reps are hard but clean.',
    cardioFinisher: false,
    focusNote: 'Progressive overload with controlled tempo is the priority.'
  },
  fatloss: {
    key: 'fatloss',
    label: 'Lose Fat',
    icon: '🔥',
    description: 'Full-body circuits, shorter rest and a conditioning finisher.',
    sets: [3, 3],
    reps: [12, 15],
    restSeconds: [30, 45],
    bandTensionHint: 'Keep the tension light enough that you never stop moving.',
    cardioFinisher: true,
    focusNote: 'Keep the heart rate up and the rest short to maximise calorie burn.'
  },
  maintain: {
    key: 'maintain',
    label: 'Maintain',
    icon: '⚖️',
    description: 'Balanced strength work with steady volume and joint-friendly pacing.',
    sets: [3, 3],
    reps: [10, 12],
    restSeconds: [45, 60],
    bandTensionHint: 'Pick a tension you can own for every single rep.',
    cardioFinisher: false,
    focusNote: 'Consistency beats intensity - train to feel strong, not wrecked.'
  }
}

const SPLITS = {
  2: [
    { title: 'Full Body A', patterns: ['squat', 'push', 'pull', 'core'] },
    { title: 'Full Body B', patterns: ['hinge', 'pull', 'push', 'lunge', 'core'] }
  ],
  3: [
    { title: 'Full Body A', patterns: ['squat', 'push', 'pull', 'core'] },
    { title: 'Full Body B', patterns: ['hinge', 'push', 'pull', 'lunge', 'core'] },
    { title: 'Full Body C', patterns: ['lunge', 'pull', 'push', 'core'] }
  ],
  4: [
    { title: 'Upper Body Strength', patterns: ['push', 'pull', 'push', 'core'] },
    { title: 'Lower Body Strength', patterns: ['squat', 'hinge', 'lunge', 'core'] },
    { title: 'Upper Body Volume', patterns: ['pull', 'push', 'pull', 'core'] },
    { title: 'Lower Body Volume', patterns: ['hinge', 'squat', 'lunge', 'core'] }
  ],
  5: [
    { title: 'Push Focus', patterns: ['push', 'push', 'core', 'cardio'] },
    { title: 'Pull Focus', patterns: ['pull', 'pull', 'core', 'cardio'] },
    { title: 'Legs & Glutes', patterns: ['squat', 'hinge', 'lunge', 'core'] },
    { title: 'Upper Body Mix', patterns: ['push', 'pull', 'push', 'core'] },
    { title: 'Full Body Circuit', patterns: ['squat', 'push', 'pull', 'hinge', 'core', 'cardio'] }
  ],
  6: [
    { title: 'Push Focus', patterns: ['push', 'push', 'core', 'cardio'] },
    { title: 'Pull Focus', patterns: ['pull', 'pull', 'core', 'cardio'] },
    { title: 'Legs & Glutes', patterns: ['squat', 'hinge', 'lunge', 'core'] },
    { title: 'Upper Body Mix', patterns: ['push', 'pull', 'pull', 'core'] },
    { title: 'Lower Body Mix', patterns: ['lunge', 'hinge', 'squat', 'core'] },
    { title: 'Full Body Circuit', patterns: ['squat', 'push', 'pull', 'hinge', 'core', 'cardio'] }
  ]
}

export const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

/* ------------------------------------------------------------------ helpers */

/** Small deterministic string hash so a plan is reproducible. */
const hashString = (value) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Seeded pseudo-random generator (mulberry32). */
const createRandom = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (items, random) => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = temp
  }
  return copy
}

const randomInRange = (min, max, random) => Math.round(min + random() * (max - min))

/**
 * Distributes training days across the week so rest days stay spread out.
 * e.g. 3 days -> Mon / Wed / Fri, 5 days -> Mon - Fri
 */
export const scheduleDays = (daysPerWeek) => {
  const combos = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5]
  }
  return combos[daysPerWeek] || combos[3]
}

const isEquipmentAllowed = (exercise, equipment) =>
  equipment === 'bands' ? true : exercise.equipment === 'bodyweight'

const PATTERN_LABELS = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Single-Leg',
  core: 'Core',
  cardio: 'Conditioning',
  mobility: 'Mobility'
}

export const describeFocus = (patterns) =>
  [...new Set(patterns)].map((pattern) => PATTERN_LABELS[pattern] || pattern).join(' · ')

/* -------------------------------------------------------------- selection */

/**
 * Picks one exercise per requested pattern, preferring exercises that have not
 * been used yet this week so the plan does not repeat itself.
 */
const pickExercises = ({ patterns, level, equipment, random, usedIds }) => {
  const picks = []

  patterns.forEach((pattern) => {
    const candidates = EXERCISES.filter(
      (exercise) =>
        exercise.pattern === pattern &&
        exercise.level <= level &&
        isEquipmentAllowed(exercise, equipment)
    )

    if (candidates.length === 0) return

    const fresh = candidates.filter((exercise) => !usedIds.has(exercise.id))
    const pool = fresh.length > 0 ? fresh : candidates
    const exercise = shuffle(pool, random)[0]

    if (!exercise) return
    if (picks.some((pick) => pick.id === exercise.id)) return

    picks.push(exercise)
    usedIds.add(exercise.id)
  })

  return picks
}

const pickFinisher = ({ level, equipment, random, usedIds, dayIds }) => {
  // Only ever consider cardio the user's level and equipment can handle, and
  // never repeat an exercise that is already in today's session.
  const eligible = EXERCISES.filter(
    (exercise) =>
      exercise.pattern === 'cardio' &&
      exercise.level <= level &&
      isEquipmentAllowed(exercise, equipment) &&
      !dayIds.has(exercise.id)
  )

  const fresh = eligible.filter((exercise) => !usedIds.has(exercise.id))
  const pool = fresh.length > 0 ? fresh : eligible
  if (pool.length === 0) return null

  const exercise = shuffle(pool, random)[0]
  usedIds.add(exercise.id)

  const rounds = level >= 3 ? 5 : level === 2 ? 4 : 3
  const work = exercise.unit === 'seconds' ? (level >= 3 ? 45 : 30) : 12

  return {
    id: exercise.id,
    name: exercise.name,
    pattern: 'cardio',
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    unit: exercise.unit,
    sets: rounds,
    reps: work,
    display: `${rounds} rounds x ${exercise.unit === 'seconds' ? `${work}s` : `${work} reps`}`,
    rest: level >= 3 ? 20 : 30,
    tempo: 'As fast as form allows',
    cue: exercise.cues,
    weightHint: 'Bodyweight only',
    isFinisher: true
  }
}

const buildExerciseEntry = ({ exercise, goalConfig, level, random }) => {
  const [minSets, maxSets] = goalConfig.sets
  const [minReps, maxReps] = goalConfig.reps
  const [minRest, maxRest] = goalConfig.restSeconds
  const levelBonus = level - 1
  const sets = randomInRange(minSets, maxSets, random) + levelBonus

  if (exercise.unit === 'seconds') {
    const seconds = 30 + levelBonus * 10 + (random() > 0.5 ? 5 : 0)
    return {
      id: exercise.id,
      name: exercise.name,
      pattern: exercise.pattern,
      muscles: exercise.muscles,
      equipment: exercise.equipment,
      unit: 'seconds',
      sets,
      reps: seconds,
      display: `${sets} x ${seconds}s`,
      rest: Math.max(minRest - levelBonus * 5, 20),
      tempo: 'Steady, controlled breathing',
      cue: exercise.cues,
      weightHint: 'Bodyweight only'
    }
  }

  const reps = randomInRange(minReps, maxReps, random)
  const displayReps = exercise.unit === 'reps-per-side' ? `${reps} / side` : `${reps}`

  return {
    id: exercise.id,
    name: exercise.name,
    pattern: exercise.pattern,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    unit: exercise.unit,
    sets,
    reps,
    display: `${sets} x ${displayReps}`,
    rest: randomInRange(minRest, maxRest, random),
    tempo: level >= 3 ? '3s down / 1s pause / explosive up' : '2s down / 1s up',
    cue: exercise.cues,
    weightHint:
      exercise.equipment === 'band'
        ? goalConfig.bandTensionHint
        : 'Slow the tempo or add a loaded backpack when it feels easy'
  }
}

const estimateMinutes = ({ entries, goalConfig }) => {
  const workSeconds = entries.reduce((total, entry) => {
    const secondsPerSet = entry.unit === 'seconds' ? entry.reps : entry.reps * 3
    return total + entry.sets * (secondsPerSet + entry.rest)
  }, 0)
  const warmup = 8 * 60
  const finisher = goalConfig.cardioFinisher ? 6 * 60 : 0
  return Math.max(20, Math.round((workSeconds + warmup + finisher) / 60))
}

const estimateCalories = ({ minutes, level, goalKey, weightKg }) => {
  const weight = Number(weightKg) > 0 ? Number(weightKg) : 70
  // Rough MET values for home resistance training at different intensities.
  const met = goalKey === 'fatloss' ? 6.5 : level >= 3 ? 6 : 5
  return Math.round(((met * 3.5 * weight) / 200) * minutes)
}

/* ------------------------------------------------------------- date helpers */

export const buildWeekLabel = (date = new Date()) => {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const format = (value) => value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${format(start)} - ${format(end)}`
}

/** ISO-ish week key, used to version generated plans and completion records. */
export const getWeekKey = (date = new Date()) => {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const dayFromMonday = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayFromMonday + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3)
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export const todayIndex = () => (new Date().getDay() + 6) % 7

export const describeProfile = (profile) => {
  const level = profile.level
    ? profile.level.charAt(0).toUpperCase() + profile.level.slice(1)
    : 'Intermediate'
  const goal = GOALS[profile.goal] || GOALS.muscle
  return `${level} · ${goal.label} · ${profile.daysPerWeek || 3} days / week`
}

/* --------------------------------------------------------------- generator */

/**
 * Generates a full weekly plan.
 *
 * @param {object} profile - { goal, level, daysPerWeek, equipment, weightKg }
 * @param {object} options - { regenerate: number } bumps the seed for a new variation
 */
export const generatePlan = (profile, options = {}) => {
  const goalKey = GOALS[profile.goal] ? profile.goal : 'muscle'
  const goalConfig = GOALS[goalKey]
  const level = LEVELS[profile.level] || 2
  const daysPerWeek = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3))
  const equipment = profile.equipment === 'bands' ? 'bands' : 'bodyweight'
  const variant = options.regenerate || 0
  const weekKey = getWeekKey()

  const seed = hashString(
    `${goalKey}|${profile.level}|${daysPerWeek}|${equipment}|${weekKey}|${variant}`
  )
  const random = createRandom(seed)

  const split = SPLITS[daysPerWeek] || SPLITS[3]
  const trainingDayIndexes = scheduleDays(daysPerWeek)
  const usedIds = new Set()

  const days = split.map((template, index) => {
    const main = pickExercises({
      patterns: template.patterns,
      level,
      equipment,
      random,
      usedIds
    }).map((exercise) => buildExerciseEntry({ exercise, goalConfig, level, random }))

    const dayIds = new Set(main.map((entry) => entry.id))
    const finisher = goalConfig.cardioFinisher
      ? pickFinisher({ level, equipment, random, usedIds, dayIds })
      : null

    const entries = finisher ? [...main, finisher] : main
    const minutes = estimateMinutes({ entries, goalConfig })
    const calories = estimateCalories({ minutes, level, goalKey, weightKg: profile.weightKg })

    return {
      id: `day-${index + 1}`,
      dayIndex: trainingDayIndexes[index],
      label: DAY_LABELS[trainingDayIndexes[index]],
      title: template.title,
      focus: describeFocus(template.patterns),
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
    weekKey,
    weekLabel: buildWeekLabel(),
    variant,
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
