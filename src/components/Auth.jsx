import { useState } from 'react'
import { describeAuthError, isAuthConfigured, signIn, signUp } from '../lib/auth.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Registration and sign-in screen.
 *
 * Backed by Supabase Auth when the env keys are configured (see
 * src/lib/auth.js). Without a configured backend the screen explains what is
 * missing and offers a local demo mode so the app stays usable.
 */
export default function Auth({ onEnterGuest }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const configured = isAuthConfigured()

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }))

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const email = form.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (mode === 'register') {
      if (!form.name.trim()) {
        setError('Please tell us your name so the coach can cheer you on.')
        return
      }
      if (form.password !== form.confirm) {
        setError('Passwords do not match.')
        return
      }
    }
    if (!configured) {
      setError(describeAuthError(new Error('AUTH_NOT_CONFIGURED')))
      return
    }

    setBusy(true)
    setError('')
    try {
      if (mode === 'register') {
        const data = await signUp({ email, password: form.password, name: form.name })
        // session === null means the project requires email confirmation.
        if (!data.session) setAwaitingConfirm(true)
        // Otherwise onAuthStateChange fires and App unmounts this screen.
      } else {
        await signIn({ email, password: form.password })
      }
    } catch (authError) {
      setError(describeAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  if (awaitingConfirm) {
    return (
      <div className="onboarding">
        <div className="onboarding__card">
          <div className="onboarding__hero">
            <span className="onboarding__badge">⚡ AI Fitness Coach</span>
            <h1>Check your email</h1>
            <p>
              We sent a confirmation link to <strong>{form.email}</strong>. Confirm your address,
              then sign in to continue.
            </p>
          </div>
          <div className="onboarding__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setAwaitingConfirm(false)
                switchMode('signin')
              }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <form className="onboarding__card" onSubmit={handleSubmit}>
        <div className="onboarding__hero">
          <span className="onboarding__badge">⚡ AI Fitness Coach</span>
          <h1>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
          <p>
            {mode === 'register'
              ? 'Register to secure access to your training plan, progress and AI coach.'
              : 'Sign in to pick up your weekly plan, progress and coach conversation where you left off.'}
          </p>
        </div>

        <div className="chip-row">
          <button
            type="button"
            className={`chip${mode === 'signin' ? ' chip--active' : ''}`}
            onClick={() => switchMode('signin')}
            aria-pressed={mode === 'signin'}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`chip${mode === 'register' ? ' chip--active' : ''}`}
            onClick={() => switchMode('register')}
            aria-pressed={mode === 'register'}
          >
            Create account
          </button>
        </div>

        {!configured && (
          <p className="alert alert--warning">
            Accounts are not configured yet - add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
            your .env file (see supabase/README.md) to enable registration and sign-in. You can
            still explore the app in demo mode below.
          </p>
        )}

        <section className="field-group">
          {mode === 'register' && (
            <label className="input-field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                maxLength={30}
                placeholder="Alex"
                autoComplete="name"
                onChange={(event) => update('name', event.target.value)}
              />
            </label>
          )}

          <label className="input-field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={(event) => update('email', event.target.value)}
            />
          </label>

          <label className="input-field">
            <span>Password {mode === 'register' && '(at least 8 characters)'}</span>
            <input
              type="password"
              value={form.password}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onChange={(event) => update('password', event.target.value)}
            />
          </label>

          {mode === 'register' && (
            <label className="input-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={form.confirm}
                placeholder="••••••••"
                autoComplete="new-password"
                onChange={(event) => update('confirm', event.target.value)}
              />
            </label>
          )}
        </section>

        {error && <p className="alert alert--error">{error}</p>}

        <div className="onboarding__actions">
          {!configured && (
            <button type="button" className="button button--ghost" onClick={onEnterGuest}>
              Continue in demo mode
            </button>
          )}
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </div>

        <p className="onboarding__disclaimer">
          This app provides general fitness and nutrition guidance. Speak with a healthcare
          professional before starting a new programme, especially if you have an existing
          condition.
        </p>
      </form>
    </div>
  )
}