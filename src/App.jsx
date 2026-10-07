import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Onboarding from './components/Onboarding.jsx'
import Auth from './components/Auth.jsx'
import Dashboard from './components/Dashboard.jsx'
import WorkoutPlan from './components/WorkoutPlan.jsx'
import Nutrition from './components/Nutrition.jsx'
import Progress from './components/Progress.jsx'
import Coach from './components/Coach.jsx'
import useLocalStorage from './hooks/useLocalStorage.js'
import { STORAGE_KEYS, clearAppStorage, markDayComplete, pruneCompletionsForPlan } from './lib/storage.js'
import { generatePlan, getWeekKey } from './lib/workoutEngine.js'
import { calculateNutrition, suggestActivity } from './lib/nutrition.js'
import {
  enterGuestMode,
  getSession,
  isAuthConfigured,
  isGuestMode,
  onAuthStateChange as subscribeAuth,
  signOut
} from './lib/auth.js'
import { askAiPlan } from './lib/aiPlan.js'
import { describeAiError, isAiConfigured } from './lib/aiClient.js'

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
  // Chat history is capped at 100 entries so localStorage can never grow
  // unbounded (see Coach.jsx send()).
  const [chat, setChat] = useLocalStorage(STORAGE_KEYS.coach, [])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingProfile, setEditingProfile] = useState(false)
  const [regenerateCount, setRegenerateCount] = useState(0)
  // Bumped whenever the ISO week rolls over while the tab stays open, so
  // weekKey/planSignature recompute and the new week's plan renders.
  const [weekTick, setWeekTick] = useState(0)

  // Plan generation status surfaced in the UI: while the real AI writes the
  // week the previous plan stays on screen, and planNotice explains any
  // fallback to the built-in engine ({ tone: 'info' | 'warning', text }).
  const [planLoading, setPlanLoading] = useState(false)
  const [planNotice, setPlanNotice] = useState(null)

  // Account state (Supabase Auth). authReady stays false until the session
  // is known so the app never flashes the wrong screen on reload.
  const [authSession, setAuthSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isAuthConfigured())
  const [guestMode, setGuestMode] = useState(() => isGuestMode())
  const authed = Boolean(authSession) || guestMode

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

  // Track the Supabase session (sign-in / sign-out / token refresh).
  useEffect(() => {
    if (!isAuthConfigured()) return undefined
    let active = true

    const subscription = subscribeAuth((session) => {
      if (!active) return
      setAuthSession(session)
      setAuthReady(true)
    })
    getSession().then((session) => {
      if (!active) return
      setAuthSession(session)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  // (Re)generate the plan whenever the profile or the week changes.
  // The ACTUAL AI writes the plan first (aiPlan.js); when it is not
  // configured, fails, or returns something invalid we fall back to the
  // deterministic engine so the app never breaks. Stale day entries (e.g.
  // day-4/day-5 after shrinking daysPerWeek) are pruned from the current
  // week alongside so counts can never exceed the plan.
  useEffect(() => {
    if (!profile || !authed) {
      // Signed out / no profile yet: nothing to generate, no spinner either.
      setPlanLoading(false)
      return undefined
    }
    if (plan?.signature === planSignature) {
      // Reset the spinner here too: a request cancelled mid-flight (signature
      // churn from the variant-restore effect) can never clear it itself.
      setPlanLoading(false)
      setCompletions((previous) => pruneCompletionsForPlan(previous, plan, weekKey))
      return undefined
    }

    let cancelled = false
    setPlanLoading(true)
    setPlanNotice(null)

    const commitPlan = (fresh) => {
      setPlan(fresh)
      setCompletions((previous) => pruneCompletionsForPlan(previous, fresh, weekKey))
      setPlanLoading(false)
    }

    const applyLocalFallback = (notice) => {
      if (cancelled) return
      const fresh = {
        ...generatePlan(profile, { regenerate: regenerateCount }),
        signature: planSignature
      }
      setPlanNotice(notice)
      commitPlan(fresh)
    }

    if (!isAiConfigured()) {
      // Not an error - the built-in engine is the documented failsafe.
      applyLocalFallback({
        tone: 'info',
        text: 'No AI endpoint configured (VITE_AI_API_URL) - showing the built-in plan.'
      })
      return () => {
        cancelled = true
      }
    }

    askAiPlan(profile, { variant: regenerateCount })
      .then((aiPlan) => {
        if (cancelled) return
        commitPlan({ ...aiPlan, signature: planSignature })
      })
      .catch((error) => {
        applyLocalFallback({
          tone: 'warning',
          text: `AI plan failed (${describeAiError(error)}) - using the built-in generator.`
        })
      })

    return () => {
      cancelled = true
    }
  }, [profile, planSignature, regenerateCount, plan, weekKey, authed, setPlan, setCompletions])

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

  // Signs out of Supabase (or leaves demo mode). Profile/plan data stays in
  // this browser so signing back in restores everything.
  const handleSignOut = useCallback(async () => {
    await signOut()
    setGuestMode(false)
    setAuthSession(null)
    setActiveTab('dashboard')
  }, [])

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

  // Auth gate: until the session is known show a loading card, then either
  // the registration/sign-in screen or the app.
  if (!authReady) {
    return (
      <div className="onboarding">
        <div className="onboarding__card">
          <div className="onboarding__hero">
            <span className="onboarding__badge">⚡ AI Fitness Coach</span>
            <h1>Loading…</h1>
            <p>Checking your account…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!authed) {
    return (
      <Auth
        onEnterGuest={() => {
          enterGuestMode()
          setGuestMode(true)
        }}
      />
    )
  }

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
    weights,
    chat,
    planLoading,
    planNotice
  }

  return (
    <div className="app">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        user={authSession?.user || null}
        guestMode={guestMode && !authSession}
        onEditProfile={() => setEditingProfile(true)}
        onSignOut={handleSignOut}
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
