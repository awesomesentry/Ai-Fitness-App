/**
 * Nutrition targets.
 *
 * Calories come from the Mifflin-St Jeor equation scaled by an activity factor,
 * then adjusted for the user's goal. Macros, water and protein are derived from
 * the goal and body weight so the numbers stay internally consistent.
 */

export const ACTIVITY_FACTORS = {
  sedentary: { value: 1.2, label: 'Sedentary (desk job, little walking)' },
  light: { value: 1.375, label: 'Light (some walking, 1-2 sessions)' },
  moderate: { value: 1.55, label: 'Moderate (3-4 sessions per week)' },
  high: { value: 1.725, label: 'High (5-6 sessions per week)' }
}

export const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
]

/** Suggests an activity factor from the number of planned training days. */
export const suggestActivity = (daysPerWeek) => {
  const days = Number(daysPerWeek) || 3
  if (days <= 2) return 'light'
  if (days <= 4) return 'moderate'
  return 'high'
}

/**
 * Mifflin-St Jeor basal metabolic rate.
 * Men:   10 x kg + 6.25 x cm - 5 x age + 5
 * Women: 10 x kg + 6.25 x cm - 5 x age - 161
 */
export const calculateBmr = ({ sex, weightKg, heightCm, age }) => {
  const weight = Number(weightKg) || 70
  const height = Number(heightCm) || 170
  const years = Number(age) || 30
  const base = 10 * weight + 6.25 * height - 5 * years
  return Math.round(sex === 'female' ? base - 161 : base + 5)
}

/** Goal-based calorie adjustment, clamped so it never goes below a safe floor. */
const goalCalories = ({ tdee, goal, sex }) => {
  const floor = sex === 'female' ? 1200 : 1500
  if (goal === 'muscle') return Math.max(floor, Math.round(tdee * 1.12))
  if (goal === 'fatloss') return Math.max(floor, Math.round(tdee * 0.82))
  return Math.max(floor, Math.round(tdee))
}

/** Macro split by goal, as a share of total calories. */
const macroSplit = (goal) => {
  if (goal === 'muscle') return { protein: 0.3, carbs: 0.45, fat: 0.25 }
  if (goal === 'fatloss') return { protein: 0.35, carbs: 0.35, fat: 0.3 }
  return { protein: 0.28, carbs: 0.47, fat: 0.25 }
}

export const GOAL_NUTRITION_NOTES = {
  muscle: 'You are in a small calorie surplus - roughly 0.3-0.5% of body weight gained per week.',
  fatloss: 'You are in a moderate deficit - aim for 0.5-1% of body weight lost per week.',
  maintain: 'You are eating at maintenance - body weight should stay within 1 kg week to week.'
}

/**
 * Returns a complete nutrition target set for a profile.
 *
 * @param {object} profile - { sex, age, heightCm, weightKg, goal, activity, daysPerWeek }
 */
export const calculateNutrition = (profile) => {
  const sex = profile.sex === 'female' ? 'female' : 'male'
  const goal = ['muscle', 'fatloss', 'maintain'].includes(profile.goal) ? profile.goal : 'maintain'
  const activityKey = ACTIVITY_FACTORS[profile.activity]
    ? profile.activity
    : suggestActivity(profile.daysPerWeek)
  const activity = ACTIVITY_FACTORS[activityKey].value
  const weight = Number(profile.weightKg) || 70

  const bmr = calculateBmr({ ...profile, sex })
  const tdee = Math.round(bmr * activity)
  const calories = goalCalories({ tdee, goal, sex })

  const split = macroSplit(goal)
  const protein = Math.round((calories * split.protein) / 4)
  const carbs = Math.round((calories * split.carbs) / 4)
  const fat = Math.round((calories * split.fat) / 9)

  // Protein density check: 1.6-2.2 g/kg is the useful range for training adults.
  const proteinPerKg = Math.round((protein / weight) * 10) / 10

  const waterLitres = Math.round((weight * 0.035 + (profile.daysPerWeek >= 4 ? 0.5 : 0)) * 10) / 10
  const meals = calories >= 2600 ? 5 : calories >= 2000 ? 4 : 3
  const stepTarget = goal === 'fatloss' ? 9000 : 7000

  return {
    bmr,
    tdee,
    calories,
    activityKey,
    activityLabel: ACTIVITY_FACTORS[activityKey].label,
    goal,
    macros: { protein, carbs, fat },
    proteinPerKg,
    waterLitres,
    meals,
    stepTarget,
    perMealCalories: Math.round(calories / meals),
    note: GOAL_NUTRITION_NOTES[goal],
    calorieDelta: calories - tdee,
    proteinTargetMin: Math.round(weight * 1.6),
    proteinTargetMax: Math.round(weight * 2.2)
  }
}

/** High-protein meal ideas that need no special equipment. */
export const MEAL_IDEAS = {
  breakfast: [
    'Greek yoghurt + oats + berries + honey',
    '3-egg omelette with spinach and wholegrain toast',
    'Protein smoothie: milk, banana, oats, peanut butter'
  ],
  lunch: [
    'Chicken or tofu rice bowl with mixed vegetables',
    'Tuna or chickpea salad wrap + fruit',
    'Lentil soup with wholegrain bread and cottage cheese'
  ],
  dinner: [
    'Salmon or lean mince with potatoes and greens',
    'Stir-fried chicken/beans with rice and broccoli',
    'Wholewheat pasta with turkey, tomato and courgette'
  ],
  snacks: [
    'Cottage cheese + nuts',
    'Boiled eggs + an apple',
    'Greek yoghurt + whey scoop',
    'Hummus + carrot sticks'
  ]
}

/** Practical tips shown on the nutrition tab, tailored to the goal. */
export const nutritionTips = (goal) => {
  const shared = [
    'Spread protein across 3-5 meals: 25-40 g per meal is easier to absorb than one big hit.',
    'Build every meal around vegetables first, then protein, then carbs.',
    'Log your intake for one week - most people under-estimate calories by 20-30%.'
  ]

  if (goal === 'muscle') {
    return [
      'Eat 300-500 kcal above maintenance and add carbs around your workouts for better sessions.',
      ...shared
    ]
  }
  if (goal === 'fatloss') {
    return [
      'Keep protein high while in a deficit - it protects muscle and keeps you full.',
      'Fill half the plate with low-calorie vegetables to stay full on fewer calories.',
      ...shared
    ]
  }
  return shared
}
