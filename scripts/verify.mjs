/**
 * Engine verification script.
 *
 * Runs the workout generator, nutrition engine, progress helpers, storage
 * helpers and the offline coach against real data, then asserts the results.
 *
 *   npm run verify
 *
 * Exits with code 1 if any check fails, so it can be wired into CI.
 */
import { EXERCISES, LEVELS } from '../src/data/exercises.js'
import { generatePlan, GOALS, getWeekKey, scheduleDays } from '../src/lib/workoutEngine.js'
import { calculateNutrition } from '../src/lib/nutrition.js'
import {
  buildStats,
  buildHistory,
  buildWeightTrend,
  achievedMilestones
} from '../src/lib/progress.js'
import {
  addWeightEntry,
  calculateStreak,
  markDayComplete,
  countWeekCompletions
} from '../src/lib/storage.js'
import { askLocalCoach, buildCoachContext, SUGGESTED_PROMPTS } from '../src/lib/coach.js'

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${label} ${detail}`)
  }
}

const libraryIds = new Set(EXERCISES.map((exercise) => exercise.id))
const baselineProfile = {
  name: 'Test Athlete',
  goal: 'muscle',
  level: 'intermediate',
  daysPerWeek: 3,
  equipment: 'bands',
  sex: 'male',
  age: 30,
  heightCm: 178,
  weightKg: 78,
  activity: 'moderate'
}

console.log('\n=== 1. Plan generation across every profile combination ===')
const combos = []
for (const goal of Object.keys(GOALS)) {
  for (const level of Object.keys(LEVELS)) {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const equipment of ['bodyweight', 'bands']) {
        combos.push({ goal, level, daysPerWeek: days, equipment })
      }
    }
  }
}

let combosOk = 0
combos.forEach((variant) => {
  const plan = generatePlan({ ...baselineProfile, ...variant })
  const entryIds = plan.days.flatMap((day) => day.exercises.map((entry) => entry.id))

  const checks = {
    dayCount: plan.days.length === variant.daysPerWeek,
    validExercises: entryIds.every((id) => libraryIds.has(id)),
    equipment: plan.days.every((day) =>
      day.exercises.every(
        (entry) => variant.equipment === 'bands' || entry.equipment === 'bodyweight'
      )
    ),
    level: plan.days.every((day) =>
      day.exercises.every(
        (entry) => EXERCISES.find((exercise) => exercise.id === entry.id).level <= LEVELS[variant.level]
      )
    ),
    volume: plan.days.every((day) => day.exercises.length >= 3),
    // Duplicates *within a single day* would be a bug; repeating a movement
    // across different days of the week is normal programming.
    uniquePerDay: plan.days.every(
      (day) => new Set(day.exercises.map((entry) => entry.id)).size === day.exercises.length
    ),
    variationsDiffer:
      new Set(
        plan.days.map((day) => day.exercises.filter((entry) => !entry.isFinisher)[0]?.id)
      ).size > 1,
    schedule:
      JSON.stringify(plan.days.map((day) => day.dayIndex)) ===
      JSON.stringify(scheduleDays(variant.daysPerWeek))
  }

  if (Object.values(checks).every(Boolean)) {
    combosOk += 1
  } else {
    failures += 1
    console.log(
      `  FAIL  ${variant.goal}/${variant.level}/${variant.daysPerWeek}d/${variant.equipment}`,
      JSON.stringify(checks)
    )
  }
})

check(
  `${combosOk}/${combos.length} profile combinations produce a valid, balanced plan`,
  combosOk === combos.length
)

console.log('\n=== 2. Plan details ===')
const plan = generatePlan(baselineProfile)
check('plan exposes a week key', Boolean(plan.weekKey), plan.weekKey)
check('plan exposes a week label', Boolean(plan.weekLabel), plan.weekLabel)
check('plan has warm-up and cool-down blocks', plan.warmup.length > 0 && plan.cooldown.length > 0)
check(
  'summary volume is positive',
  plan.summary.totalSets > 0 && plan.summary.totalMinutes > 0 && plan.summary.totalCalories > 0,
  JSON.stringify(plan.summary)
)
check(
  'every exercise entry has display text, rest and a cue',
  plan.days.every((day) =>
    day.exercises.every((entry) => entry.display && Number.isFinite(entry.rest) && entry.cue)
  )
)
check(
  'fat-loss plans add a conditioning finisher',
  generatePlan({ ...baselineProfile, goal: 'fatloss' }).days.every((day) =>
    day.exercises.some((entry) => entry.isFinisher)
  )
)
check(
  'muscle plans do not add a finisher',
  generatePlan({ ...baselineProfile, goal: 'muscle' }).days.every(
    (day) => !day.exercises.some((entry) => entry.isFinisher)
  )
)

const signature = (value) =>
  value.days.map((day) => day.exercises.map((entry) => entry.id).join(',')).join('|')
check(
  'same profile + week is deterministic',
  signature(plan) === signature(generatePlan(baselineProfile))
)
check(
  'regenerate produces a different selection',
  signature(plan) !== signature(generatePlan(baselineProfile, { regenerate: 1 }))
)

console.log('\n=== 3. Nutrition targets ===')
const nutritionScenarios = [
  { goal: 'muscle', sex: 'male' },
  { goal: 'fatloss', sex: 'male' },
  { goal: 'fatloss', sex: 'female' },
  { goal: 'maintain', sex: 'female' }
]

nutritionScenarios.forEach((scenario) => {
  const nutrition = calculateNutrition({ ...baselineProfile, ...scenario })
  const macroCalories =
    nutrition.macros.protein * 4 + nutrition.macros.carbs * 4 + nutrition.macros.fat * 9
  const macrosAlign = Math.abs(macroCalories - nutrition.calories) <= 12

  check(
    `${scenario.goal}/${scenario.sex}: ${nutrition.calories} kcal | P${nutrition.macros.protein} C${nutrition.macros.carbs} F${nutrition.macros.fat} | TDEE ${nutrition.tdee} | water ${nutrition.waterLitres} L`,
    nutrition.calories > 1200 && macrosAlign && nutrition.proteinPerKg > 1,
    `macro kcal=${macroCalories} vs target=${nutrition.calories}`
  )
})

const muscleNutrition = calculateNutrition(baselineProfile)
const fatlossNutrition = calculateNutrition({ ...baselineProfile, goal: 'fatloss' })
check(
  'muscle target is above maintenance and fat loss below',
  muscleNutrition.calories > muscleNutrition.tdee && fatlossNutrition.calories < fatlossNutrition.tdee
)
check(
  'female fat-loss target respects the 1200 kcal floor',
  calculateNutrition({ ...baselineProfile, goal: 'fatloss', sex: 'female', weightKg: 45 })
    .calories >= 1200
)

console.log('\n=== 4. Completion log, streaks and stats ===')
const weekKey = getWeekKey()
let completions = {}

completions = markDayComplete(completions, weekKey, 'day-1', true)
check('marking a day stores a completion', countWeekCompletions(completions, weekKey) === 1)

completions = markDayComplete(completions, weekKey, 'day-1', false)
check('un-marking removes the completion', countWeekCompletions(completions, weekKey) === 0)

completions = markDayComplete(completions, weekKey, 'day-1', true)
completions = markDayComplete(completions, weekKey, 'day-2', true)
check('multiple completions in one week', countWeekCompletions(completions, weekKey) === 2)

const streak = calculateStreak(completions)
check(
  'streak counts the current week and its sessions',
  streak.weeks === 1 && streak.sessions === 2,
  JSON.stringify(streak)
)

// Three consecutive weeks of history to exercise the chart + streak maths.
const history = {}
const now = Date.now()
for (let offset = 0; offset < 3; offset += 1) {
  history[getWeekKey(new Date(now - offset * 7 * 24 * 60 * 60 * 1000))] = {
    'day-1': new Date().toISOString(),
    'day-2': new Date().toISOString()
  }
}

const stats = buildStats({ completions: history, plan, weights: [] })
check('3-week streak detected', stats.streakWeeks === 3, `weeks=${stats.streakWeeks}`)
check('total sessions counted', stats.totalSessions === 6, String(stats.totalSessions))
check('estimated burn is positive', stats.totalCalories > 0 && stats.totalMinutes > 0)

const chart = buildHistory({ completions: history, plan, weeks: 8 })
check('chart returns 8 buckets', chart.length === 8, String(chart.length))
check('chart marks the current week last', chart[chart.length - 1].weekKey === weekKey)
check(
  'chart percentage stays within 0-100',
  chart.every((week) => week.percent >= 0 && week.percent <= 100)
)
check('this week reports full completion', chart[7].completed === 2, JSON.stringify(chart[7].completed))

const milestones = achievedMilestones({ completions: history, plan })
check('milestones unlock from history', milestones.length >= 2, milestones.join(', '))

console.log('\n=== 5. Weight log ===')
let weights = addWeightEntry([], 80.4)
weights = addWeightEntry(weights, 79.8)
check('same-day weight entry overwrites instead of duplicating', weights.length === 1)

const trend = buildWeightTrend([...weights, { date: '2026-08-01', kg: 82 }])
check('weight trend computes a delta', trend.delta !== null, JSON.stringify(trend.delta))
check('weight trend has a message', typeof trend.message === 'string' && trend.message.length > 0)
check(
  'invalid weights are rejected',
  addWeightEntry(weights, 'abc').length === weights.length &&
    addWeightEntry(weights, -5).length === weights.length
)

console.log('\n=== 6. AI coach (offline engine) ===')
const context = {
  ...buildCoachContext({ profile: baselineProfile, plan, completions: history, weekKey }),
  completed: 2,
  planned: plan.days.length
}
check('coach context includes the user data', context.text.includes('Build Muscle'), context.text)

const probeQuestions = [
  'hi',
  'How do I lose fat faster?',
  'How much protein should I eat?',
  'I am sore after leg day',
  'I feel demotivated this week',
  'How do I break a plateau?',
  'Do bands work for building muscle?',
  'How many rest days do I need?',
  'How am I doing this week?',
  'Should I warm up?',
  'Something completely unrelated'
]

probeQuestions.forEach((question) => {
  const answer = askLocalCoach({ message: question, context })
  check(`"${question}" -> ${answer.split('\n')[0].slice(0, 62)}`, answer.length > 40)
})

check(
  'every suggested prompt produces an answer',
  SUGGESTED_PROMPTS.every((prompt) => askLocalCoach({ message: prompt, context }).length > 40)
)

console.log('\n=== 7. Exercise library integrity ===')
check('library has exercises', EXERCISES.length >= 40, String(EXERCISES.length))
check(
  'exercise ids are unique',
  new Set(EXERCISES.map((exercise) => exercise.id)).size === EXERCISES.length
)
check(
  'every exercise has the required fields',
  EXERCISES.every(
    (exercise) =>
      exercise.id &&
      exercise.name &&
      exercise.pattern &&
      exercise.level >= 1 &&
      exercise.level <= 3 &&
      ['bodyweight', 'band'].includes(exercise.equipment) &&
      ['reps', 'seconds', 'reps-per-side'].includes(exercise.unit) &&
      Array.isArray(exercise.muscles) &&
      exercise.muscles.length > 0 &&
      Boolean(exercise.cues)
  )
)
check(
  'beginners have bodyweight options for every main pattern',
  ['push', 'pull', 'squat', 'hinge', 'core'].every((pattern) =>
    EXERCISES.some(
      (exercise) =>
        exercise.pattern === pattern && exercise.level === 1 && exercise.equipment === 'bodyweight'
    )
  )
)
check(
  'band exercises exist for push, pull, squat, hinge and lunge',
  ['push', 'pull', 'squat', 'hinge', 'lunge'].every((pattern) =>
    EXERCISES.some((exercise) => exercise.pattern === pattern && exercise.equipment === 'band')
  )
)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`)
process.exit(failures === 0 ? 0 : 1)