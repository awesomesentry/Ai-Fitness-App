/**
 * Shared client for the configured OpenAI-compatible endpoint.
 *
 * Both the AI coach chat and the AI workout-plan generator go through
 * `chatCompletion()` so configuration, timeouts and error codes live in one
 * place. Nothing here is "fake": if the endpoint is not configured the
 * callers fall back to their offline paths (see coach.js / aiPlan.js).
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

export const AI_CONFIG = {
  /** OpenAI-compatible chat completions URL (VITE_AI_API_URL). */
  url: env.VITE_AI_API_URL || '',
  /** Bearer key (VITE_AI_API_KEY). Optional for local endpoints like Ollama. */
  key: env.VITE_AI_API_KEY || '',
  /** Model name (VITE_AI_MODEL). */
  model: env.VITE_AI_MODEL || 'gpt-4o-mini'
}

/** True when a chat completions endpoint is configured through the env. */
export const isAiConfigured = () => Boolean(AI_CONFIG.url)

/**
 * Human-readable explanation of an AI error code, used in UI notices.
 * Codes are intentionally opaque in transit (AI_HTTP_401 etc.) and only
 * expanded here.
 */
export const describeAiError = (error) => {
  const code = String(error?.message || 'AI_UNKNOWN_ERROR')

  if (code === 'AI_NOT_CONFIGURED') return 'no AI endpoint configured'
  if (code === 'AI_TIMEOUT') return 'the AI request timed out'
  if (code === 'AI_NETWORK_ERROR') return 'network error reaching the AI endpoint'
  if (code === 'AI_EMPTY_RESPONSE') return 'the AI returned an empty response'
  if (code.startsWith('AI_HTTP_401') || code.startsWith('AI_HTTP_403')) {
    return 'the AI endpoint rejected the API key'
  }
  if (code.startsWith('AI_HTTP_429')) return 'the AI endpoint is rate limiting us'
  if (code.startsWith('AI_HTTP_')) return `AI endpoint error (${code.slice(8)})`
  if (code === 'AI_BAD_JSON') return 'the AI reply was not valid JSON'
  if (code.startsWith('AI_INVALID_PLAN')) return code.replace('AI_INVALID_PLAN: ', '')

  // Anything else (validation messages, unexpected failures) is shown as-is
  // but trimmed so it never spills a stack trace into the UI.
  return code.split('\n')[0].slice(0, 140)
}

/**
 * Sends messages to the configured chat completions endpoint and returns the
 * assistant's text. Throws coded errors so callers can fall back:
 * AI_NOT_CONFIGURED, AI_TIMEOUT, AI_NETWORK_ERROR, AI_HTTP_<status>,
 * AI_EMPTY_RESPONSE.
 *
 * @param {object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @param {number} [options.timeoutMs] - aborts stalled endpoints
 */
export const chatCompletion = async ({
  messages,
  temperature = 0.6,
  maxTokens = 800,
  timeoutMs = 20_000
}) => {
  if (!isAiConfigured()) throw new Error('AI_NOT_CONFIGURED')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(AI_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_CONFIG.key ? { Authorization: `Bearer ${AI_CONFIG.key}` } : {})
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    })
  } catch (error) {
    throw new Error(error?.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    // Intentionally NOT echoing the raw body: endpoints can leak key fragments.
    throw new Error(`AI_HTTP_${response.status}`)
  }

  const data = await response.json()
  const reply = data?.choices?.[0]?.message?.content
  if (!reply) throw new Error('AI_EMPTY_RESPONSE')
  return reply.trim()
}
