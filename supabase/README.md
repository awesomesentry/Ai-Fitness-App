# Supabase setup

**Auth (registration / sign-in) is wired in** - `src/lib/auth.js` + `src/components/Auth.jsx`
activate as soon as you add the two env vars below. Until then the app runs fully without
Supabase: everything lives in `localStorage` and the auth screen offers a local demo mode.

The **data tables** (profile, plan, completions, weights, chat) are still staged so you can
migrate them later (see step 4).

## 1. Create the project

1. Go to supabase.com -> New project (free tier works).
2. Open **SQL Editor** -> New query.
3. Paste the whole of `schema.sql` and run it.

## 2. Add the keys locally

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Find both under **Settings -> API**. Use the **anon public** key -
never the service-role key. Restart `npm run dev` afterwards.

## 2b. Enable email auth

1. Dashboard -> **Authentication -> Sign In / Up** -> **Email** provider: enabled.
2. For quick local testing, turn **Confirm email** off (otherwise registrations
   land on the "check your email" screen until you click the link).
3. Sign-ups created from the app store `display_name` in the user metadata;
   the navbar reads it via `accountLabel()` in `src/lib/auth.js`.

The auth screens then go live: **Create account** (`signUp`), **Sign in**
(`signInWithPassword`) and **Sign out** in the navbar. Sessions persist across
reloads (the Supabase client in `src/lib/supabase.js` is a singleton with
`persistSession: true`).

## 3. Verify the connection

In the browser console on http://localhost:5173:

```js
const m = await import('/src/lib/supabase.js')
m.isSupabaseConfigured() // true once .env is set
await m.getSupabaseClient().auth.getSession() // session or null
```

## 4. Migrating the data sets (when ready)

`src/lib/supabase.js` documents each shape next to its target table.
Per data set in `src/App.jsx`: select latest on mount (fall back to
localStorage offline), upsert/insert on change, delete profile row on
reset (FK cascades clean the rest). Suggested order:
profile -> weights -> completions -> plan -> chat.
Keep each step behind `isSupabaseConfigured()`.

## 5. Before production

- Replace the dev anon policies with auth.uid()-scoped ones.
- Proxy the AI coach key server-side (VITE_AI_API_KEY is client-bundled).