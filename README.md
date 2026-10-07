# ⚡ AI Fitness Coach

A React + Vite web app that generates a personalised weekly training plan, sets your nutrition and
calorie targets, tracks your progress in `localStorage`, and gives you an AI coach you can chat with.

Everything runs in the browser - no backend, no account, no data leaves your machine unless you
explicitly connect an AI API key.

---

## ✨ Features

| Feature | What it does |
| --- | --- |
| 🏋️ **AI-generated workout plans** | Builds a weekly split (2-6 days) from your goal, level, available days and equipment, picking exercises from a 60+ movement library. |
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

On first run the app shows an onboarding form. Fill it in and your plan is generated instantly.

---

## 🤖 Enabling the live AI coach (optional)

The coach works without any configuration using a built-in rule-based engine. To use a real LLM:

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

If a request fails (no key, bad URL, rate limit), the chat automatically falls back to the offline
coach and tells you why.

---

## 🧠 How the plan is generated

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
│   ├── Onboarding.jsx      # Profile form (goal, level, days, equipment, body data)
│   ├── Navbar.jsx          # Sticky navigation + profile menu
│   ├── Dashboard.jsx       # Greeting, weekly ring, next workout, macro summary
│   ├── WorkoutPlan.jsx     # All training days, warm-up/cool-down, exercise library
│   ├── DayCard.jsx         # One training day (expandable, mark-as-done)
│   ├── Nutrition.jsx       # Calorie/macro targets, meal ideas, coaching tips
│   ├── Progress.jsx        # Consistency chart, weight log, milestones, reset
│   ├── Coach.jsx           # AI chat interface
│   └── StatCard.jsx        # Reusable metric tile
├── hooks/
│   └── useLocalStorage.js  # useState + localStorage persistence
├── lib/
│   ├── workoutEngine.js    # Plan generator (splits, selection, prescriptions)
│   ├── nutrition.js        # BMR/TDEE/macro engine + meal ideas
│   ├── coach.js            # Live AI client + offline rule-based coach
│   ├── progress.js         # Stats, history chart data, export helper
│   └── storage.js          # Storage keys, completions, streaks, weight log
└── data/
    └── exercises.js        # Exercise library + levels + movement patterns

scripts/
└── verify.mjs              # npm run verify - engine assertions, no browser needed
```

---

## 🛠️ Commands


## 🔌 Supabase (optional backend - staged, not yet wired in)

The app runs fully **without** Supabase (localStorage only). The backend is
staged so you can switch over when ready: `supabase/schema.sql` creates the
tables, `supabase/README.md` walks through project setup, and
`src/lib/supabase.js` is the client seam (returns `null` until
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set in `.env`).

No code path reads Supabase yet - when you provide your key, follow
`supabase/README.md` step 4 to migrate each data set behind
`isSupabaseConfigured()`, keeping localStorage as the offline fallback.

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