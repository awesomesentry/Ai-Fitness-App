import { useState } from 'react'
import { GOALS } from '../lib/workoutEngine.js'
import { ACTIVITY_FACTORS, SEX_OPTIONS, suggestActivity } from '../lib/nutrition.js'

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', hint: 'New to training or coming back after a long break' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Training consistently for 6+ months' },
  { value: 'advanced', label: 'Advanced', hint: '1+ year of structured training' }
]

const EQUIPMENT_OPTIONS = [
  { value: 'bodyweight', label: 'Bodyweight only', hint: 'No equipment at all' },
  { value: 'bands', label: 'Bodyweight + bands', hint: 'Resistance bands and/or light weights' }
]

const DAY_OPTIONS = [2, 3, 4, 5, 6]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function Onboarding({ initialProfile, isEditing, onComplete, onCancel }) {
  const [form, setForm] = useState({ ...initialProfile, name: initialProfile.name || '' })
  const [error, setError] = useState('')

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()

    const weightKg = Number(form.weightKg)
    const heightCm = Number(form.heightCm)
    const age = Number(form.age)

    if (!form.name.trim()) {
      setError('Please tell us your name so the coach can cheer you on.')
      return
    }
    if (!(weightKg > 25 && weightKg < 300)) {
      setError('Enter a body weight between 25 kg and 300 kg.')
      return
    }
    if (!(heightCm > 100 && heightCm < 250)) {
      setError('Enter a height between 100 cm and 250 cm.')
      return
    }
    if (!(age > 12 && age < 100)) {
      setError('Enter an age between 13 and 99.')
      return
    }

    setError('')
    onComplete({
      ...form,
      name: form.name.trim(),
      age,
      heightCm,
      weightKg,
      activity: form.activity || suggestActivity(form.daysPerWeek)
    })
  }

  return (
    <div className="onboarding">
      <form className="onboarding__card" onSubmit={handleSubmit}>
        <div className="onboarding__hero">
          <span className="onboarding__badge">⚡ AI Fitness Coach</span>
          <h1>{isEditing ? 'Update your profile' : 'Let’s build your plan'}</h1>
          <p>
            Answer a few quick questions and we&apos;ll generate a weekly workout split, calorie
            targets and a coach that knows your numbers. No account needed - everything stays in
            this browser.
          </p>
        </div>

        <section className="field-group">
          <h2 className="field-group__title">1. Your goal</h2>
          <div className="option-grid">
            {Object.values(GOALS).map((goal) => (
              <button
                type="button"
                key={goal.key}
                className={`option-card${form.goal === goal.key ? ' option-card--active' : ''}`}
                onClick={() => update('goal', goal.key)}
                aria-pressed={form.goal === goal.key}
              >
                <span className="option-card__title">
                  <span aria-hidden="true">{goal.icon}</span> {goal.label}
                </span>
                <span className="option-card__hint">{goal.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field-group">
          <h2 className="field-group__title">2. Experience level</h2>
          <div className="option-grid option-grid--three">
            {LEVEL_OPTIONS.map((level) => (
              <button
                type="button"
                key={level.value}
                className={`option-card${form.level === level.value ? ' option-card--active' : ''}`}
                onClick={() => update('level', level.value)}
                aria-pressed={form.level === level.value}
              >
                <span className="option-card__title">{level.label}</span>
                <span className="option-card__hint">{level.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field-group">
          <h2 className="field-group__title">3. Training days per week</h2>
          <div className="chip-row">
            {DAY_OPTIONS.map((days) => (
              <button
                type="button"
                key={days}
                className={`chip${Number(form.daysPerWeek) === days ? ' chip--active' : ''}`}
                onClick={() => update('daysPerWeek', days)}
                aria-pressed={Number(form.daysPerWeek) === days}
              >
                {days} days
              </button>
            ))}
          </div>
        </section>

        <section className="field-group">
          <h2 className="field-group__title">4. Equipment</h2>
          <div className="option-grid">
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <button
                type="button"
                key={equipment.value}
                className={`option-card${
                  form.equipment === equipment.value ? ' option-card--active' : ''
                }`}
                onClick={() => update('equipment', equipment.value)}
                aria-pressed={form.equipment === equipment.value}
              >
                <span className="option-card__title">{equipment.label}</span>
                <span className="option-card__hint">{equipment.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field-group">
          <h2 className="field-group__title">5. About you</h2>
          <div className="input-grid">
            <label className="input-field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                maxLength={30}
                placeholder="Alex"
                onChange={(event) => update('name', event.target.value)}
              />
            </label>

            <label className="input-field">
              <span>Sex (used for calorie maths)</span>
              <select value={form.sex} onChange={(event) => update('sex', event.target.value)}>
                {SEX_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-field">
              <span>Age</span>
              <input
                type="number"
                min="13"
                max="99"
                value={form.age}
                onChange={(event) => update('age', clamp(Number(event.target.value), 13, 99))}
              />
            </label>

            <label className="input-field">
              <span>Height (cm)</span>
              <input
                type="number"
                min="100"
                max="250"
                value={form.heightCm}
                onChange={(event) => update('heightCm', clamp(Number(event.target.value), 100, 250))}
              />
            </label>

            <label className="input-field">
              <span>Weight (kg)</span>
              <input
                type="number"
                min="25"
                max="300"
                step="0.1"
                value={form.weightKg}
                onChange={(event) => update('weightKg', Number(event.target.value))}
              />
            </label>

            <label className="input-field">
              <span>Activity outside training</span>
              <select
                value={form.activity || suggestActivity(form.daysPerWeek)}
                onChange={(event) => update('activity', event.target.value)}
              >
                {Object.entries(ACTIVITY_FACTORS).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error && <p className="alert alert--error">{error}</p>}

        <div className="onboarding__actions">
          {onCancel && (
            <button type="button" className="button button--ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="button button--primary">
            {isEditing ? 'Save and regenerate plan' : 'Generate my AI plan'}
          </button>
        </div>

        <p className="onboarding__disclaimer">
          This app provides general fitness and nutrition guidance. Speak with a healthcare
          professional before starting a new programme, especially if you have an existing condition.
        </p>
      </form>
    </div>
  )
}