/**
 * AI Coach.
 *
 * When an OpenAI-compatible endpoint is configured through Vite env variables
 * the coach sends the user's question plus their training context to that API
 * via the shared client in `aiClient.js`. Without configuration (or when a
 * request fails) the app falls back to a built-in rule-based coach so the
 * feature always works offline - that failsafe stays on purpose.
 */

import { GOALS, describeProfile } from './workoutEngine.js'
import { calculateNutrition, projectNutrition } from './nutrition.js'
import { AI_CONFIG, chatCompletion, describeAiError, isAiConfigured } from './aiClient.js'

// Re-exported so Coach.jsx keeps a single import site for AI helpers.
export { AI_CONFIG, isAiConfigured, describeAiError }

/** Compact snapshot of the user's situation, used as context for both coaches. */
export const buildCoachContext = ({ profile, plan, completions, weekKey, nutrition: provided }) => {
  if (!profile) return { text: 'No profile yet.', profile: null, plan: null }

  const nutrition = provided || calculateNutrition(profile)
  const goal = GOALS[profile.goal] || GOALS.muscle
  const completed = Object.keys(completions?.[weekKey] || {}).length
  const planned = plan?.days?.length || profile.daysPerWeek || 3

  const lines = [
    `Name: ${profile.name || 'Athlete'}`,
    `Goal: ${goal.label} (${describeProfile(profile)})`,
    `Level: ${profile.level}, equipment: ${plan?.equipment === 'bands' ? 'bodyweight + resistance bands' : 'bodyweight only'}`,
    `Body data: ${profile.weightKg || 70} kg, ${profile.heightCm || 170} cm, age ${profile.age || 30}, ${profile.sex || 'male'}`,
    `Calorie target: ${nutrition.calories} kcal (TDEE ${nutrition.tdee}), protein ${nutrition.macros.protein} g, water ${nutrition.waterLitres} L`,
    `This week: ${completed} of ${planned} sessions completed`,
    `Weekly split: ${
      plan?.days?.map((day) => `${day.label} - ${day.title}`).join('; ') || 'not generated yet'
    }`
  ]

  return { text: lines.join('\n'), profile, plan, nutrition, goal, completed, planned }
}

/** Prompt template given to the upstream model. */
export const buildSystemPrompt = (context) => `You are "Coach Kai", a friendly, encouraging and practical AI fitness coach.
You specialise in home workouts with bodyweight and resistance bands, plus everyday nutrition.
Rules:
- Be concise: 3-6 short sentences or a small bullet list.
- Always reference the user's actual data when relevant (goal, level, calories, completed sessions).
- Give concrete, actionable steps (sets, reps, food amounts, timings).
- Never diagnose medical conditions or prescribe medication. Tell the user to see a doctor or
  a registered dietitian if the question is medical.
- Never recommend steroids, fat burners or extreme starvation diets.

User context:
${context.text}`

/**
 * Sends a message to the configured chat completions endpoint.
 * Throws on network/HTTP errors so the caller can fall back.
 * A 20s timeout prevents a stalled endpoint from hanging the chat forever.
 */
export const askAiCoach = async ({ message, history = [], context }) => {
  const messages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history
      .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: entry.text })),
    { role: 'user', content: message }
  ]

  // chatCompletion throws AI_NOT_CONFIGURED / AI_TIMEOUT / AI_HTTP_<n> so the
  // caller in Coach.jsx can fall back to the offline coach with a reason.
  return chatCompletion({ messages, temperature: 0.6, maxTokens: 500, timeoutMs: 20_000 })
}

/* --------------------------------------------------- offline rule-based coach */

const INTENTS = [
  {
    id: 'plateau',
    keywords: ['plateau', 'not progressing', 'stuck', 'no progress', 'stopped growing'],
    build: ({ nutrition, goal }) => [
      `Plateaus usually mean the body has adapted. For ${goal.label.toLowerCase()} we break it with:`,
      '1. Add one more set to your two hardest exercises (or 2 reps per set) each week.',
      `2. Tighten the food side: you are aiming for ${nutrition.calories} kcal with ${nutrition.macros.protein} g protein per day.`,
      '3. Sleep 7-9 hours - recovery is where the adaptation actually happens.',
      '4. Take a lighter week (half the volume) every 6-8 weeks, then restart progression.'
    ]
  },
  {
    id: 'soreness',
    keywords: ['sore', 'soreness', 'doms', 'ache', 'aching', 'pain'],
    build: () => [
      'Mild soreness 24-48 h after training is normal, especially with tempo reps.',
      '- Train the sore muscle lightly (50% volume, no hard sets) to boost blood flow.',
      '- 10 minutes of easy walking or cycling, plus 5 minutes of mobility for the area.',
      '- Protein and water speed recovery: hit your daily protein target and drink steadily.',
      'If the pain is sharp, one-sided or lasts more than 4 days, rest and see a physio or doctor.'
    ]
  },
  {
    id: 'motivation',
    keywords: ['motivat', 'lazy', 'tired', 'give up', 'quit', 'demotivated', 'cant be bothered'],
    build: ({ completed, planned }) => [
      `You are at ${completed} of ${planned} sessions this week - that is already worth protecting.`,
      '- Shrink the goal: commit to 10 minutes. Starting is the hard part.',
      '- Use the easiest version of the session in your plan (warm-up + 2 exercises counts).',
      '- Stack it on a habit you already have (after coffee, before your shower).',
      '- Put the next session in your calendar now with an exact time.'
    ]
  },
  {
    id: 'weightloss',
    keywords: ['lose weight', 'lose fat', 'slim', 'cut', 'fat loss', 'losing weight'],
    build: ({ nutrition, profile }) => {
      // Project a genuine fat-loss target: quoting `nutrition.calories` here
      // would advertise the user's *current* goal target under a cut's label,
      // and `calorieDelta` can be positive when the goal is not fat loss.
      const target = projectNutrition(profile, 'fatloss')
      const drop = Math.max(0, target.tdee - target.calories)
      return [
        `For fat loss at ${profile.weightKg || 70} kg you would eat about ${target.calories} kcal per day (${target.tdee} kcal maintenance, a ${drop} kcal deficit).`,
        `- Protein ${target.macros.protein} g, carbs ${target.macros.carbs} g, fat ${target.macros.fat} g.`,
        `- Water ${nutrition.waterLitres} L and about ${nutrition.stepTarget} steps on training and rest days.`,
        '- Train 3-5 times a week: your generated plan plus the conditioning finishers is plenty.',
        '- Check the scale weekly, not daily. A 0.5-1% drop per week is the sweet spot.'
      ]
    }
  },
  {
    id: 'muscle',
    keywords: ['build muscle', 'gain muscle', 'bulk', 'get bigger', 'hypertrophy', 'grow'],
    build: ({ nutrition, profile }) => {
      // Project from the *profile*, not from the user's current goal target,
      // so a user who is currently cutting still gets honest bulking numbers.
      const target = projectNutrition(profile, 'muscle')
      const surplus = target.calories - target.tdee
      return [
        `To build muscle at ${profile.weightKg || 70} kg eat about ${target.calories} kcal per day (${Math.max(0, surplus)} kcal over your ${target.tdee} kcal maintenance) with ${target.macros.protein} g protein.`,
        '- Prioritise the big patterns: push-up, squat, hinge and row variations 2-3 times weekly.',
        '- Add reps before adding complexity: hit the top of the rep range on every set first.',
        '- Rest 60-90 seconds between sets so each set stays high quality.',
        '- Aim to gain roughly 0.25-0.5% of body weight per week, not more.'
      ]
    }
  },
  {
    id: 'nutrition',
    keywords: ['eat', 'diet', 'food', 'meal', 'calorie', 'protein', 'macro', 'nutrition'],
    build: ({ nutrition, goal }) => [
      `Daily targets: ${nutrition.calories} kcal | protein ${nutrition.macros.protein} g | carbs ${nutrition.macros.carbs} g | fat ${nutrition.macros.fat} g | water ${nutrition.waterLitres} L.`,
      `Split it across ${nutrition.meals} meals (~${nutrition.perMealCalories} kcal each).`,
      '- Protein anchor per meal: eggs, Greek yoghurt, chicken, tuna, tofu, lentils, cottage cheese.',
      '- Carbs around training: rice, oats, potatoes, fruit.',
      goal.key === 'fatloss'
        ? '- Keep the deficit moderate and protein high to protect muscle.'
        : '- Aim for two palm-sized portions of protein per meal if hitting the number is hard.'
    ]
  },
  {
    id: 'bands',
    keywords: ['band', 'resistance band', 'equipment', 'no gym', 'home gym'],
    build: () => [
      'Bands are great for home training - the skill is tension management:',
      '- Anchor low for presses and rows, high for pulldowns, and step on the band for squats and curls.',
      '- Shorten the band or double it up to increase resistance instead of adding weight.',
      '- Band tension peaks at the top, so pause one second at full contraction on every rep.',
      '- If a movement feels easy, use the harder variation listed in your plan library.'
    ]
  },
  {
    id: 'rest',
    keywords: ['rest', 'recovery', 'how often', 'off day', 'sleep', 'days per week'],
    build: ({ plan }) => [
      `You train ${plan?.days?.length || 3} days per week and rest on ${plan?.restDays?.join(', ') || 'the remaining days'}.`,
      '- Sleep 7-9 hours: it drives recovery, appetite control and strength gains.',
      '- Rest days can still include walking, mobility or light band work.',
      '- Your split already spreads hard patterns apart, so keep the volume honest.',
      '- Deload every 6-8 weeks by halving your sets for one week.'
    ]
  },
  {
    id: 'progress',
    keywords: ['progress', 'track', 'streak', 'how am i doing', 'improving'],
    build: ({ completed, planned, nutrition }) => [
      `This week you have completed ${completed} of ${planned} planned sessions.`,
      '- Track three numbers: session completion, reps or band tension, and weekly average body weight.',
      `- Your nutrition target (${nutrition.calories} kcal / ${nutrition.macros.protein} g protein) is what turns training into results.`,
      '- Take photos and measurements every 4 weeks - the mirror changes slower than the numbers.',
      '- Progress weekly, not daily: beat last week by one rep or one set.'
    ]
  },
  {
    id: 'warmup',
    keywords: ['warm up', 'warmup', 'stretch', 'cool down', 'cooldown', 'injury'],
    build: ({ plan }) => [
      'Use the warm-up block at the top of every workout day:',
      `- ${plan?.warmup?.map((item) => item.name).join(', ') || 'Cat-Cow, Hip Circles, World\u2019s Greatest Stretch'} for about 5 minutes.`,
      `- Finish with ${plan?.cooldown?.map((item) => item.name).join(', ') || 'the cooldown sequence'} for 3-5 minutes.`,
      '- Add one light warm-up set of your first exercise at half effort.',
      '- Sharp joint pain means stop that movement and swap it for a pain-free alternative.'
    ]
  }
]

const GREETING_WORDS = ['hi', 'hello', 'hey', 'yo', 'good morning', 'good evening']

export const SUGGESTED_PROMPTS = [
  'Build me a plan with only resistance bands',
  'How do I lose fat faster?',
  'I am sore after leg day - should I train?',
  'How much protein should I eat?',
  'I feel demotivated this week',
  'How do I progress when workouts feel easy?'
]

/**
 * Deterministic offline coach. Uses the user's own plan, nutrition targets and
 * completion log so the answers always feel personal.
 */
export const askLocalCoach = ({ message, context }) => {
  // Strip trailing punctuation so "hello!", "hi?" etc. still match.
  const text = String(message || '')
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, '')
    .trim()

  if (!text) return 'Ask me anything about your training, nutrition or recovery.'

  // Context can arrive incomplete (e.g. right after a reset) - fall back to
  // values derived from the profile instead of throwing mid-reply.
  const goal = context.goal || GOALS[context.profile?.goal] || GOALS.muscle
  const nutrition = context.nutrition || calculateNutrition(context.profile || {})
  const completed = Number.isFinite(context.completed) ? context.completed : 0
  const planned = context.planned || context.plan?.days?.length || 3

  if (GREETING_WORDS.some((word) => text === word || text.startsWith(`${word} `))) {
    return [
      `Hey${context.profile?.name ? ` ${context.profile.name}` : ''} - ready to work?`,
      `You are on the ${goal.label} plan with ${planned} sessions this week, ${completed} done.`,
      'Ask me about your workouts, nutrition targets, soreness, motivation or progression.'
    ].join('\n')
  }

  const intent = INTENTS.find((candidate) =>
    candidate.keywords.some((keyword) => text.includes(keyword))
  )

  if (intent) {
    return intent
      .build({
        plan: context.plan,
        nutrition,
        goal,
        profile: context.profile || {},
        completed,
        planned
      })
      .join('\n')
  }

  // Nothing matched - return a useful status summary instead of a dead end.
  const nextDay = context.plan?.days?.[completed % (context.plan?.days?.length || 1)]
  return [
    `Quick status: ${goal.label}, ${completed}/${planned} sessions done this week.`,
    nextDay ? `Next up: ${nextDay.label} - ${nextDay.title} (~${nextDay.minutes} min).` : '',
    `Nutrition: ${nutrition.calories} kcal, protein ${nutrition.macros.protein} g, water ${nutrition.waterLitres} L.`,
    '',
    'I can help with exercise technique, swapping exercises, weekly splits, calories and macros, soreness and recovery, or staying motivated.'
  ]
    .filter(Boolean)
    .join('\n')
}