import { useState } from 'react'
import StatCard from './StatCard.jsx'
import { MEAL_IDEAS, nutritionTips } from '../lib/nutrition.js'

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks'
}

export default function Nutrition({ profile, nutrition }) {
  const [portion, setPortion] = useState(1)

  if (!nutrition) return <p className="empty">Loading your nutrition targets…</p>

  const tips = nutritionTips(nutrition.goal)
  const scaledCalories = Math.round(nutrition.calories * portion)
  const scaledMacros = {
    protein: Math.round(nutrition.macros.protein * portion),
    carbs: Math.round(nutrition.macros.carbs * portion),
    fat: Math.round(nutrition.macros.fat * portion)
  }

  return (
    <div className="page">
      <section className="panel panel--flush">
        <div className="plan-header">
          <div>
            <p className="hero__eyebrow">Nutrition targets · {nutrition.activityLabel}</p>
            <h1>Your daily nutrition plan</h1>
            <p className="hero__sub">{nutrition.note}</p>
          </div>
        </div>

        <div className="stat-grid stat-grid--compact">
          <StatCard label="Maintenance" value={nutrition.tdee} unit="kcal" hint="TDEE estimate" />
          <StatCard
            label="Target intake"
            value={nutrition.calories}
            unit="kcal"
            hint={
              nutrition.calorieDelta === 0
                ? 'At maintenance'
                : `${nutrition.calorieDelta > 0 ? '+' : ''}${nutrition.calorieDelta} kcal vs TDEE`
            }
            tone="positive"
          />
          <StatCard label="BMR" value={nutrition.bmr} unit="kcal" hint="Mifflin-St Jeor" />
          <StatCard
            label="Protein"
            value={nutrition.macros.protein}
            unit="g"
            hint={`${nutrition.proteinPerKg} g/kg · range ${nutrition.proteinTargetMin}-${nutrition.proteinTargetMax} g`}
          />
        </div>
      </section>

      {portion === 0.85 && (
        <p className="alert alert--info">
          Rest-day numbers: eat around {scaledCalories} kcal with {scaledMacros.protein} g protein.
          Save the extra carbs for your training days.
        </p>
      )}

      {portion === 1.15 && (
        <p className="alert alert--info">
          Training-day numbers: around {scaledCalories} kcal with {scaledMacros.protein} g protein.
          Put most of the extra carbs before and after your session.
        </p>
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>Macro breakdown</h2>
          <div className="chip-row">
            {[
              { value: 0.85, label: 'Rest day' },
              { value: 1, label: 'Standard' },
              { value: 1.15, label: 'Training day' }
            ].map((option) => (
              <button
                type="button"
                key={option.label}
                className={`chip${portion === option.value ? ' chip--active' : ''}`}
                onClick={() => setPortion(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="macro-bar" role="img" aria-label="Macro split">
          {[
            { key: 'protein', grams: nutrition.macros.protein, calories: nutrition.macros.protein * 4 },
            { key: 'carbs', grams: nutrition.macros.carbs, calories: nutrition.macros.carbs * 4 },
            { key: 'fat', grams: nutrition.macros.fat, calories: nutrition.macros.fat * 9 }
          ].map((macro) => (
            <div
              key={macro.key}
              className={`macro-bar__segment macro-bar__segment--${macro.key}`}
              style={{ width: `${Math.round((macro.calories / nutrition.calories) * 100)}%` }}
              title={`${macro.key}: ${macro.grams} g`}
            />
          ))}
        </div>

        <div className="macro-row">
          <div className="macro">
            <span className="macro__value">{scaledMacros.protein} g</span>
            <span className="macro__label">Protein</span>
          </div>
          <div className="macro">
            <span className="macro__value">{scaledMacros.carbs} g</span>
            <span className="macro__label">Carbs</span>
          </div>
          <div className="macro">
            <span className="macro__value">{scaledMacros.fat} g</span>
            <span className="macro__label">Fat</span>
          </div>
          <div className="macro">
            <span className="macro__value">{scaledCalories}</span>
            <span className="macro__label">kcal</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition.waterLitres} L</span>
            <span className="macro__label">Water</span>
          </div>
          <div className="macro">
            <span className="macro__value">{nutrition.meals}</span>
            <span className="macro__label">Meals (~{nutrition.perMealCalories} kcal)</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Meal ideas</h2>
          <span className="panel__sub">
            Aim for roughly {nutrition.perMealCalories} kcal and {Math.round(nutrition.macros.protein / nutrition.meals)} g protein per meal
          </span>
        </div>

        <div className="meal-grid">
          {Object.entries(MEAL_IDEAS).map(([key, ideas]) => (
            <div key={key} className="info-block">
              <h3>{MEAL_LABELS[key]}</h3>
              <ul className="bullet-list">
                {ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Coaching tips</h2>
          <span className="panel__sub">Tailored to your {nutrition.goal} goal</span>
        </div>
        <ul className="bullet-list bullet-list--spaced">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}