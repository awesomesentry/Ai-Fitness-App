/**
 * Supabase backend - optional staging seam.
 *
 * The app is fully self-contained in `localStorage` right now. This module is
 * the Supabase entry point: when the Vite env variables below are NOT set it
 * returns `null`, so the app behaves exactly as it does today. Once you paste
 * the keys from your Supabase project (see `supabase/README.md`), the app can
 * migrate each data set (profile, plan, completions, weights, chat) to
 * Supabase tables instead of the browser.
 */

import { createClient } from '@supabase/supabase-js'

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

export const SUPABASE_CONFIG = {
  /**
   * From `supabase.com/dashboard/<project>/settings/API` -> "Project URL".
   */
  url: env.VITE_SUPABASE_URL || '',

  /**
   * From the same page -> "anon public" key. Safe to read here (it is meant
   * to live in the client). NEVER put a service-role key in a VITE_ variable.
   */
  anonKey: env.VITE_SUPABASE_ANON_KEY || '',

  /**
   * Table names created by `supabase/schema.sql`.
   */
  tables: {
    profile: 'profiles',
    plan: 'plans',
    completions: 'completions',
    weights: 'weights',
    chat: 'chat_messages'
  }
}

/** True only when both the URL and the anon key are configured. */
export const isSupabaseConfigured = () => Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey)

/**
 * Returns a connected client when configured, otherwise `null` (fail-safe).
 * Always call this lazily (inside effects/handlers) so the app never touches
 * the network while the env vars are absent.
 */
export const createSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null

  // persistSession:false - the app has no login flow yet, so the browser's
  // localStorage stays the source of truth until auth is added.
  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

/**
 * Lazily returns a connected client when configured, otherwise `null`.
 * Prefer this alias in components - it reads as intent ("give me the backend
 * if there is one").
 */
export const getSupabaseClient = () => createSupabaseClient()

/* ------------------------------------------------------------------ */
/* MIGRATION MAP - the exact shapes the app persists today            */
/* ------------------------------------------------------------------ */
/**
 * Data sets (all stored under an `aifit:` prefix in localStorage today):
 *   1. profile      (profile object: name, goal, level, daysPerWeek,
 *                    equipment, sex, age, heightCm, weightKg, activity)
 *   2. plan         (generated plan + signature + variant)
 *   3. completions  ({ [weekKey]: { [dayId]: ISOString } })
 *   4. weights      (newest-first: [{ date, kg }], capped at 60)
 *   5. chat         (coach chat: [{ role, text, source }])
 *
 * Suggested Supabase schema (see `supabase/schema.sql`):
 *
 *   profiles      (id uuid PK, name, goal, level, days_per_week, equipment,
 *                  sex, age, height_cm, weight_kg, activity, created_at)
 *   plans         (id uuid PK, profile_id uuid FK, week_key, payload jsonb,
 *                  signature text, variant int)
 *   completions   (id uuid PK, profile_id uuid FK, week_key text, day_id text,
 *                  completed_at timestamptz)
 *   weights       (id uuid PK, profile_id uuid FK, date date, kg numeric)
 *   chat_messages (id uuid PK, profile_id uuid FK, role text, text text,
 *                  source text, created_at timestamptz)
 *
 * When the backend tables are created, swap each `useLocalStorage` call in
 * `src/App.jsx` for a load-on-mount + save-on-change pair against the client
 * above, keeping the localStorage values as the offline fallback.
 */

/** The exact localStorage shape for each data set (mirrors STORAGE_KEYS). */
export const DATA_SETS = {
  profile: { key: 'aifit:profile', default: null },
  plan: { key: 'aifit:plan', default: null },
  completions: { key: 'aifit:completions', default: {} },
  weights: { key: 'aifit:weights', default: [] },
  chat: { key: 'aifit:coach-chat', default: [] }
}
