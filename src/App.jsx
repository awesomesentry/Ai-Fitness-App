import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Onboarding from './components/Onboarding.jsx'
import Dashboard from './components/Dashboard.jsx'
import WorkoutPlan from './components/WorkoutPlan.jsx'
import Nutrition from './components/Nutrition.jsx'
import Progress from './components/Progress.jsx'
import Coach from './components/Coach.jsx'
import useLocalStorage from './hooks/useLocalStorage.js'
import { STORAGE_KEYS, clearAppStorage, markDayComplete, pruneCompletionsForPlan } from './lib/storage.js'
import { generatePlan, getWeekKey } from './lib/workoutEngine.js'
import { calculateNutrition, suggestActivity } from './lib/nutrition.js'

export const DEFAULT_PROFILE = {
  name: '',
  goal: 'muscle',
  level: 'beginner',
  daysPerWeek: 3,
  equipment: 'bodyweight',
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activity: 'moderate'
}

export default function App() {
  const [profile, setProfile] = useLocalStorage(STORAGE_KEYS.profile, null)
  const [plan, setPlan] = useLocalStorage(STORAGE_KEYS.plan, null)
  const [completions, setCompletions] = useLocalStorage(STORAGE_KEYS.completions, {})
  const [weights, setWeights] = useLocalStorage(STORAGE_KEYS.weights, [])
  const [chat, setChat] = useLocalStorage(STORAGE_KEYS.coach, [])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingProfile, setEditingProfile] = useState(false)
  const [regenerateCount, setRegenerateCount] = useState(0)
  // Bumped whenever the ISO week rolls over while the tab stays open, so
  // weekKey/planSignature recompute and the new week's plan renders.
  const [weekTick, setWeekTick] = useState(0)

  // Derive the current week key; weekTick forces a re-render check across
  // week boundaries for long-lived tabs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekKey = useMemo(() => getWeekKey(), [weekTick])

  /** Signature of everything that should trigger a brand new plan. */
  const planSignature = profile
    ? [
        profile.goal,
        profile.level,
        profile.daysPerWeek,
        profile.equipment,
        profile.weightKg,
        weekKey,
        regenerateCount
      ].join('|')
    : ''

  // Restore the persisted regenerate counter (stored on the plan as `variant`)
  // so a reload keeps the same plan shuffle instead of silently resetting to 0.
  // The plan write below always carries `variant: regenerateCount`, so this
  // converges after one render and then stays quiet.
  useEffect(() => {
    if (typeof plan?.variant === 'number' && plan.variant !== regenerateCount) {
      setRegenerateCount(plan.variant)
    }
  }, [plan, regenerateCount])

  // Re-render check for ISO-week rollover while the tab stays open.
  // A stale weekKey would otherwise keep serving the previous week's plan,
  // completions and coach context until the next interaction.
  useEffect(() => {
    let lastSeen = getWeekKey()
    const id = window.setInterval(() => {
      const next = getWeekKey()
      if (next !== lastSeen) {
        lastSeen = next
        setWeekTick((tick) => tick + 1)
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  // (Re)generate the plan whenever the profile or the week changes.
  // Stale day entries (e.g. day-4/day-5 after shrinking daysPerWeek) are
  // pruned alongside so counts can never exceed the current plan.
  useEffect(() => {
    if (!profile) return
    if (plan?.signature === planSignature) {
      setCompletions((previous) => pruneCompletionsForPlan(previous, plan))
      return
    }
    const fresh = { ...generatePlan(profile, { regenerate: regenerateCount }), signature: planSignature }
    setPlan(fresh)
    setCompletions((previous) => pruneCompletionsForPlan(previous, fresh))
  }, [profile, planSignature, regenerateCount, plan, setPlan, setCompletions])

  const nutrition = useMemo(() => (profile ? calculateNutrition(profile) : null), [profile])

  const handleCompleteProfile = useCallback(
    (nextProfile) => {
      const merged = {
        ...DEFAULT_PROFILE,
        ...nextProfile,
        activity: nextProfile.activity || suggestActivity(nextProfile.daysPerWeek)
      }
      setProfile(merged)
      setEditingProfile(false)
      setActiveTab('dashboard')
    },
    [setProfile]
  )

  const handleRegenerate = useCallback(() => setRegenerateCount((count) => count + 1), [])

  const handleToggleDay = useCallback(
    (dayId, completed) => {
      setCompletions((previous) => markDayComplete(previous, weekKey, dayId, completed))
    },
    [setCompletions, weekKey]
  )

  const handleWeightChange = useCallback((nextWeights) => setWeights(nextWeights), [setWeights])

  const handleResetAll = useCallback(() => {
    clearAppStorage()
    setProfile(null)
    setPlan(null)
    setCompletions({})
    setWeights([])
    setChat([])
    setRegenerateCount(0)
    setEditingProfile(false)
    setActiveTab('dashboard')
  }, [setProfile, setPlan, setCompletions, setWeights, setChat])

  // First run (or after a reset) - collect the profile before showing the app.
  if (!profile || editingProfile) {
    return (
      <Onboarding
        initialProfile={profile || DEFAULT_PROFILE}
        isEditing={Boolean(profile) && editingProfile}
        onComplete={handleCompleteProfile}
        onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
      />
    )
  }

  const sharedProps = {
    profile,
    plan,
    nutrition,
    completions,
    weekKey,
    weights
  }

  return (
    <div className="app">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        onEditProfile={() => setEditingProfile(true)}
      />

      <main className="app__main">
        {activeTab === 'dashboard' && (
          <Dashboard
            {...sharedProps}
            onTabChange={setActiveTab}
            onToggleDay={handleToggleDay}
            onRegenerate={handleRegenerate}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutPlan
            {...sharedProps}
            onToggleDay={handleToggleDay}
            onRegenerate={handleRegenerate}
          />
        )}

        {activeTab === 'nutrition' && <Nutrition profile={profile} nutrition={nutrition} />}

        {activeTab === 'progress' && (
          <Progress
            {...sharedProps}
            onWeightChange={handleWeightChange}
            onResetAll={handleResetAll}
          />
        )}

        {activeTab === 'coach' && (
          <Coach
            {...sharedProps}
            chat={chat}
            onChatChange={setChat}
            onTabChange={setActiveTab}
            onRegenerate={handleRegenerate}
          />
        )}
      </main>

      <footer className="app__footer">
        <span>
          Built with React + Vite · Your data stays in this browser&apos;s local storage.
        </span>
        <span>Educational guidance only - not medical advice.</span>
      </footer>
    </div>
  )
}
