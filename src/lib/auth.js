/**
 * Supabase authentication: registration, sign-in and sign-out.
 *
 * When the Supabase env vars are not set (no .env yet) every call fails with
 * AUTH_NOT_CONFIGURED and the Auth screen offers a local demo mode instead,
 * so the app stays usable before a backend exists.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase.js'
import { loadValue, removeValue, saveValue } from './storage.js'

export { isSupabaseConfigured as isAuthConfigured }

/** Local demo-mode flag: set from the Auth screen when Supabase is absent. */
const GUEST_KEY = 'aifit:guest'

export const isGuestMode = () => loadValue(GUEST_KEY, false) === true
export const enterGuestMode = () => saveValue(GUEST_KEY, true)
export const exitGuestMode = () => removeValue(GUEST_KEY)

/** Grabs the configured client or throws the code the Auth screen displays. */
const requireClient = () => {
  const client = getSupabaseClient()
  if (!client) throw new Error('AUTH_NOT_CONFIGURED')
  return client
}

/**
 * Creates an account. Returns Supabase's `data`; `data.session` is `null`
 * when the project requires email confirmation, in which case the Auth
 * screen shows a "check your email" state instead of signing in.
 */
export const signUp = async ({ email, password, name }) => {
  const client = requireClient()
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Display name travels with the user metadata (used in the navbar).
      data: { display_name: String(name || '').trim() }
    }
  })
  if (error) throw error
  return data
}

/** Signs in with email + password. Throws Supabase's error on failure. */
export const signIn = async ({ email, password }) => {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password
  })
  if (error) throw error
  return data
}

/**
 * Signs out and leaves demo mode. Errors are swallowed on purpose: the local
 * session is cleared either way, and a dead network should never trap the
 * user inside the app.
 */
export const signOut = async () => {
  exitGuestMode()
  const client = getSupabaseClient()
  if (!client) return
  try {
    await client.auth.signOut()
  } catch (error) {
    console.warn('Supabase signOut failed:', error?.message || error)
  }
}

/** Current session (or null). Resolves even when nothing is configured. */
export const getSession = async () => {
  const client = getSupabaseClient()
  if (!client) return null
  try {
    const { data } = await client.auth.getSession()
    return data?.session || null
  } catch {
    return null
  }
}

/**
 * Subscribes to session changes. Returns the Supabase subscription so the
 * caller can unsubscribe on cleanup; returns null when not configured.
 */
export const onAuthStateChange = (handler) => {
  const client = getSupabaseClient()
  if (!client) return null
  const { data } = client.auth.onAuthStateChange((_event, session) => handler(session || null))
  return data.subscription || null
}

/** Human-readable label for the signed-in account (navbar). */
export const accountLabel = (user) => {
  if (!user) return ''
  const displayName = String(user.user_metadata?.display_name || '').trim()
  return displayName || user.email || 'Signed in'
}

const ERROR_MESSAGES = {
  'Invalid login credentials': 'Incorrect email or password.',
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Email not confirmed': 'Confirm your email address first, then sign in.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'Signup requires a valid password': 'Password must be at least 6 characters.',
  'Signups not allowed': 'Registration is disabled on this project.',
  AUTH_NOT_CONFIGURED:
    'Accounts are not configured yet - add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, or continue in demo mode.'
}

/** Maps Supabase/auth errors to copy that a user can act on. */
export const describeAuthError = (error) => {
  const message = String(error?.message || error || '')
  if (ERROR_MESSAGES[message]) return ERROR_MESSAGES[message]
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Too many attempts - wait a minute and try again.'
  }
  if (message.includes('fetch') || message.includes('Network') || message.includes('Failed to fetch')) {
    return 'Could not reach the authentication service. Check your connection and try again.'
  }
  return message.split('\n')[0].slice(0, 160) || 'Something went wrong. Please try again.'
}