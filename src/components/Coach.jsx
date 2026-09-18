import { useMemo, useRef, useState } from 'react'
import {
  AI_CONFIG,
  SUGGESTED_PROMPTS,
  askAiCoach,
  askLocalCoach,
  buildCoachContext,
  isAiConfigured
} from '../lib/coach.js'

const WELCOME = {
  role: 'assistant',
  text: "Hi, I'm Coach Kai. I know your goal, your weekly plan and your calorie targets, so ask me anything - technique, soreness, food, motivation or how to progress. I can also reshuffle your plan if you want a fresh variation."
}

const QUICK_ACTIONS = [
  { label: '🏋️ Today’s session', tab: 'workout' },
  { label: '🥗 My nutrition', tab: 'nutrition' },
  { label: '📈 My progress', tab: 'progress' }
]

export default function Coach({
  profile,
  plan,
  completions,
  weekKey,
  nutrition,
  chat,
  onChatChange,
  onTabChange,
  onRegenerate
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const bottomRef = useRef(null)

  const messages = chat && chat.length > 0 ? chat : [WELCOME]
  const aiEnabled = isAiConfigured()

  const context = useMemo(() => {
    const built = buildCoachContext({ profile, plan, completions, weekKey })
    return {
      ...built,
      nutrition: built.nutrition || nutrition,
      completed: Object.keys(completions?.[weekKey] || {}).length,
      planned: plan?.days?.length || profile?.daysPerWeek || 3
    }
  }, [profile, plan, completions, weekKey, nutrition])

  const send = async (rawMessage) => {
    const message = rawMessage.trim()
    if (!message || busy) return

    const history = messages.filter((entry) => entry !== WELCOME)
    const nextHistory = [...history, { role: 'user', text: message }]
    onChatChange(nextHistory)
    setDraft('')
    setBusy(true)
    setNotice('')

    let reply = ''
    let usedAi = false

    if (aiEnabled) {
      try {
        reply = await askAiCoach({ message, history, context })
        usedAi = true
      } catch (error) {
        setNotice(
          `Live AI request failed (${error.message}). Replying with the built-in offline coach instead.`
        )
      }
    }

    if (!reply) reply = askLocalCoach({ message, context })

    onChatChange([
      ...nextHistory,
      { role: 'assistant', text: reply, source: usedAi ? 'ai' : 'local' }
    ])
    setBusy(false)

    // Keep the newest message in view on the next paint.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    send(draft)
  }

  return (
    <div className="page">
      <section className="panel panel--flush">
        <div className="plan-header">
          <div>
            <p className="hero__eyebrow">
              AI Coach · {aiEnabled ? `live model (${AI_CONFIG.model})` : 'offline coach'}
            </p>
            <h1>Talk to Coach Kai</h1>
            <p className="hero__sub">
              {aiEnabled
                ? 'Connected to your configured AI endpoint. Questions are sent with a summary of your plan and nutrition targets.'
                : 'Running the built-in rule-based coach. Add an API key in .env to switch on live AI answers (see the README).'}
            </p>
          </div>
          <div className="plan-header__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={onRegenerate}
              title="Shuffle the exercise selection for this week"
            >
              ↻ Regenerate plan
            </button>
          </div>
        </div>

        <div className="chip-row chip-row--wrap">
          {QUICK_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.tab}
              className="chip"
              onClick={() => onTabChange(action.tab)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel chat">
        <div className="chat__log">
          {messages.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`bubble bubble--${entry.role === 'user' ? 'user' : 'coach'}`}
            >
              <div className="bubble__meta">
                {entry.role === 'user' ? profile?.name || 'You' : 'Coach Kai'}
                {entry.source === 'ai' && <span className="tag tag--ai">live AI</span>}
              </div>
              <div className="bubble__text">
                {entry.text.split('\n').map((line, lineIndex) => (
                  <p key={`${index}-${lineIndex}`}>{line || '\u00a0'}</p>
                ))}
              </div>
            </div>
          ))}

          {busy && (
            <div className="bubble bubble--coach">
              <div className="bubble__meta">Coach Kai</div>
              <div className="bubble__text bubble__text--typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {notice && <p className="alert alert--warning">{notice}</p>}

        <div className="chip-row chip-row--wrap">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              type="button"
              key={prompt}
              className="chip"
              onClick={() => send(prompt)}
              disabled={busy}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form className="chat__form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            placeholder="Ask about training, soreness, food or motivation…"
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Message the AI coach"
          />
          <button type="submit" className="button button--primary" disabled={busy || !draft.trim()}>
            {busy ? 'Thinking…' : 'Send'}
          </button>
        </form>

        {chat?.length > 0 && (
          <button type="button" className="link-button" onClick={() => onChatChange([])}>
            Clear conversation
          </button>
        )}
      </section>
    </div>
  )
}