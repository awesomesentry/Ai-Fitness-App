# ⚡ AI Fitness Coach

A React + Vite web app where the **actual AI** writes your personalised weekly training plan, sets
your nutrition and calorie targets, tracks your progress in `localStorage`, and chats with you as
your coach. Registration and sign-in are built on Supabase Auth.

AI features activate as soon as you connect an OpenAI-compatible endpoint (`.env`). Until then a
deterministic engine and an offline rule-based coach keep everything usable, and the auth screens
offer a local demo mode - nothing breaks when the AI or a backend is unavailable.

---

## ✨ Features

| Feature | What it does |
| --- | --- |
| 🔐 **Registration & sign in** | Supabase Auth-backed create-account and sign-in screens (with email confirmation support), a persistent session, and a local demo mode until your project keys are added. |
| 🏋️ **AI-written workout plans** | The real AI builds your weekly split (2-6 days) from your goal, level, available days and equipment; every response is validated against the 60+ movement library before it renders. If the AI is unavailable, the built-in engine takes over with a visible notice. |
| 🎯 **Fitness goals** | Build Muscle, Lose Fat or Maintain. Each goal changes sets, reps, rest, tempo, calorie targets and macro split. |
| 💪 **Levels** | Beginner / Intermediate / Advanced - controls exercise difficulty, weekly volume and tempo cues. |
| 🏠 **Home + resistance-band workouts** | Every exercise needs nothing more than bodyweight, a band or a loaded backpack. Filter the library by bodyweight or band. |
| 🥗 **Nutrition & calorie targets** | Mifflin-St Jeor BMR → TDEE → goal-adjusted calories, macros, protein per kg, water and step targets, meal ideas, and rest-day / training-day adjustments. |
| 📊 **Progress tracking** | 8-week completion chart, streak calculator, weight log with trend, milestone badges and JSON export. |
| 🤖 **AI Coach** | Chat interface that knows your plan and targets. Works offline with a rule-based coach, or with a live LLM when you add an API key. |
| 📱 **Responsive design** | Desktop dashboard layout collapses to a mobile-friendly single column. |
| 💾 **Local storage** | Profile, generated plan, session completions, weight log and chat history all persist across reloads. |

---

## 🚀 Getting started

```bash
# 1. install dependencies
npm install

# 2. start the dev server (opens http://localhost:5173)
npm run dev

# 3. production build + preview
npm run build
npm run preview

# 4. optional: verify the plan/nutrition/progress engines and the coach
npm run verify
```

Requires **Node.js 18+**.

On first run the app shows the **sign in / create account** screen. Create an account (or continue
in demo mode while Supabase is unconfigured), then fill in the onboarding form and your plan is
generated instantly.

---

## 🤖 Connecting the real AI (plans + coach)

Two features use the actual AI when configured through the env:

- **Weekly plans** (`src/lib/aiPlan.js`) - the model returns plan JSON which is validated and
  hydrated against the exercise library; without an endpoint (or on any failure) the deterministic
  engine generates the plan and the UI shows why.
- **Coach chat** (`src/lib/coach.js`) - works offline with a built-in rule-based coach (the
  failsafe); with an endpoint configured, answers come from the live model.

To enable both:

1. Copy `.env.example` to `.env`
2. Fill in an OpenAI-compatible chat completions endpoint:

```env
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_API_KEY=sk-your-key-here
VITE_AI_MODEL=gpt-4o-mini
```

3. Restart the dev server.

Works with **OpenAI**, **Groq**, **OpenRouter**, **Ollama** (no key needed) or any other
OpenAI-compatible endpoint.

> ⚠️ Anything prefixed with `VITE_` is bundled into the client. Only use this for personal/demo
> projects or with a restricted key. For production, proxy requests through your own backend.

If a request fails (no key, bad URL, rate limit), the chat falls back to the offline coach and the
plan falls back to the built-in engine - both tell you why.

---

## 🧠 How the plan is generated

When `VITE_AI_API_URL` is set, `src/lib/aiPlan.js` asks the model for the plan (JSON) using your
profile plus the allowed exercise catalogue, then validates and hydrates the reply - unknown ids
are dropped, sets/reps/rest are clamped, and day labels, schedule, warm-up, cool-down and summary
totals are computed locally. The steps below describe the **deterministic fallback engine**
(`src/lib/workoutEngine.js`) used whenever the AI is unavailable:

1. **Split selection** - the number of training days maps to a split template:
   - 2 days → Full Body A / B
   - 3 days → Full Body A / B / C
   - 4 days → Upper/Lower Strength + Upper/Lower Volume
   - 5-6 days → Push, Pull, Legs, Upper focus, Full-body circuit
2. **Exercise selection** - one exercise per movement pattern (push, pull, squat, hinge, lunge, core,
   conditioning), filtered by level and equipment. Movements already used that week are skipped so
   the plan stays varied.
3. **Prescription** - sets, reps, rest and tempo come from your goal configuration plus a level
   bonus, so beginners and advanced users get different volumes.
4. **Seed** - the generator is seeded from `goal + level + days + equipment + week key`, so your plan
   stays stable within a week but rotates over time. "Regenerate" bumps the seed for a new variation.

Session calorie burn is estimated from MET values scaled by body weight and session length.

## 🥗 How nutrition targets are calculated

1. **BMR** - Mifflin-St Jeor: `10 × kg + 6.25 × cm − 5 × age + 5` (men) / `− 161` (women)
2. **TDEE** - BMR × activity factor (1.2 sedentary → 1.725 high)
3. **Calories** - Muscle: TDEE × 1.12 · Fat loss: TDEE × 0.82 · Maintain: TDEE (floored at 1200/1500 kcal)
4. **Macros** - protein/carb/fat split by goal (30/45/25 muscle, 35/35/30 fat loss, 28/47/25 maintain)
5. **Extras** - water (35 ml/kg + 0.5 L on 4+ training days), meal count, per-meal calories, step target

---

## 📁 Project structure

```
src/
├── App.jsx                 # App shell, tab routing, plan generation effect
├── main.jsx                # React entry point
├── styles.css              # Design tokens, layout, components, responsive rules
├── components/
│   ├── Auth.jsx             # Registration + sign-in screens (Supabase Auth)
│   ├── Onboarding.jsx       # Profile form (goal, level, days, equipment, body data)
│   ├── Navbar.jsx           # Sticky navigation + account menu (sign out)
│   ├── Dashboard.jsx        # Greeting, weekly ring, next workout, macro summary
│   ├── WorkoutPlan.jsx      # All training days, warm-up/cool-down, exercise library
│   ├── DayCard.jsx          # One training day (expandable, mark-as-done)
│   ├── Nutrition.jsx        # Calorie/macro targets, meal ideas, coaching tips
│   ├── Progress.jsx         # Consistency chart, weight log, milestones, reset
│   ├── Coach.jsx            # AI chat interface (offline coach as failsafe)
│   ├── ErrorBoundary.jsx    # Top-level crash screen
│   └── StatCard.jsx         # Reusable metric tile
├── hooks/
│   └── useLocalStorage.js   # useState + localStorage persistence
├── lib/
│   ├── aiClient.js          # Shared AI endpoint client (config, timeout, errors)
│   ├── aiPlan.js            # AI plan prompt + validation + hydration
│   ├── auth.js              # Supabase signUp/signIn/signOut/session helpers
│   ├── supabase.js          # Singleton Supabase client (null until configured)
│   ├── workoutEngine.js     # Fallback plan generator (splits, selection, prescriptions)
│   ├── nutrition.js         # BMR/TDEE/macro engine + meal ideas
│   ├── coach.js             # Live AI chat + offline rule-based coach (failsafe)
│   ├── progress.js          # Stats, history chart data, export helper
│   └── storage.js           # Storage keys, completions, streaks, weight log
└── data/
    └── exercises.js         # Exercise library + levels + movement patterns

scripts/
└── verify.mjs              # npm run verify - engine assertions, no browser needed
```

---

## 🛠️ Commands


## 🔌 Supabase (auth is wired; data tables staged)

**Auth is live**: `src/lib/auth.js` + `src/components/Auth.jsx` use Supabase Auth for registration,
sign-in and sign-out as soon as `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set in `.env`
(see `supabase/README.md`). Without keys the auth screen explains itself and offers a local demo
mode.

The **data tables** are still staged for later: `supabase/schema.sql` creates them and
`src/lib/supabase.js` documents each data set's shape. To migrate, follow `supabase/README.md`
step 4 and swap each data set behind `isSupabaseConfigured()`, keeping localStorage as the
offline fallback.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Run 60+ engine checks (plans, nutrition, progress, coach) without a browser |

### What `npm run verify` checks

- **90/90 profile combinations** (every goal × level × days-per-week × equipment) produce a plan
  where every exercise exists, matches the user's level and equipment, has at least 3 movements,
  never repeats within a single day, and lands on the right weekdays.
- Goal-specific prescription: fat-loss plans get a conditioning finisher, muscle plans do not.
- Determinism (same profile + week yields the same plan) and variation (regenerate reshuffles).
- Nutrition maths: macros add back up to the calorie target, surplus/deficit direction is correct,
  and calorie floors are respected.
- Completion log, streak counting, chart buckets, milestones and weight-log validation.
- The offline coach answers greetings, all intent categories and the suggested prompts.

---

##  Data & privacy

Everything is stored under the `aifit:` prefix in your browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `aifit:profile` | Goal, level, days, equipment and body data |
| `aifit:plan` | The generated plan plus its signature |
| `aifit:completions` | `{ weekKey: { dayId: timestamp } }` |
| `aifit:weights` | Weight log entries |
| `aifit:coach-chat` | Chat history |

Use **Progress → Export data** for a JSON backup, and **Progress → Reset all data** to wipe
everything. Clearing your browser storage also removes the data.

---

## ️ Disclaimer

This app provides general fitness and nutrition information for educational purposes. It is **not**
medical advice. Consult a healthcare professional before starting a new training or nutrition
programme, especially if you have an existing medical condition, are pregnant, or are returning from
injury.