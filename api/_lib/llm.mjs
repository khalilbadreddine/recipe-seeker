/**
 * Minimal multi-turn LLM client for the website chat (api/chat.mjs).
 *
 * Same free providers and order as the content pipeline
 * (pipeline/scripts/lib/llm.mjs), all speaking the OpenAI
 * /v1/chat/completions dialect. Tuned for a live visitor instead of a batch
 * job: short per-attempt timeouts, a cap on attempts, and a total time budget
 * so the function always answers before the platform timeout.
 *
 * Env (set in Vercel → Project → Settings → Environment Variables; at least one):
 *   XAI_API_KEY, XAI_MODEL
 *   OPENROUTER_API_KEY, OPENROUTER_CHAT_MODELS (comma-separated, optional)
 *   NVIDIA_API_KEY, NVIDIA_MODEL
 *   GEMINI_API_KEY, GEMINI_MODEL
 */

const SITE_URL = process.env.SITE_URL || 'https://recipe-seeker-client.vercel.app'

const PROVIDERS = [
  {
    id: 'xai',
    keyEnv: 'XAI_API_KEY',
    base: 'https://api.x.ai/v1',
    models: () => [process.env.XAI_MODEL || 'grok-4-1-fast'],
  },
  {
    id: 'openrouter',
    keyEnv: 'OPENROUTER_API_KEY',
    base: 'https://openrouter.ai/api/v1',
    // :free models rotate; override with OPENROUTER_CHAT_MODELS when one dies.
    models: () =>
      (process.env.OPENROUTER_CHAT_MODELS || 'deepseek/deepseek-v4-flash-0731:free,z-ai/glm-5.2:free,google/gemma-4-26b-a4b-it:free')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    headers: () => ({ 'HTTP-Referer': SITE_URL, 'X-Title': 'Recipe Seeker Chat' }),
  },
  {
    id: 'nvidia',
    keyEnv: 'NVIDIA_API_KEY',
    base: 'https://integrate.api.nvidia.com/v1',
    models: () => [process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b'],
  },
  {
    id: 'gemini',
    keyEnv: 'GEMINI_API_KEY',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: () => [process.env.GEMINI_MODEL || 'gemini-2.0-flash'],
  },
]

export function isLlmConfigured() {
  return PROVIDERS.some((p) => process.env[p.keyEnv])
}

async function attempt(provider, key, model, messages, { timeoutMs, maxTokens }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${provider.base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        ...(provider.headers ? provider.headers() : {}),
      },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens }),
    })
    if (!res.ok) {
      const err = new Error(`${provider.id}/${model} HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    const json = await res.json()
    const text = json.choices?.[0]?.message?.content?.trim() || ''
    if (!text) throw new Error(`${provider.id}/${model} empty response`)
    return { text, provider: provider.id, model }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Run the fallback chain. Returns { text, provider, model } or throws.
 * opts: { budgetMs = 20000, attemptTimeoutMs = 12000, maxAttempts = 3, maxTokens = 500 }
 */
export async function chatCompletion(messages, opts = {}) {
  const { budgetMs = 20_000, attemptTimeoutMs = 12_000, maxAttempts = 3, maxTokens = 500 } = opts
  const deadline = Date.now() + budgetMs
  const failures = []
  let attempts = 0
  for (const provider of PROVIDERS) {
    const key = process.env[provider.keyEnv]
    if (!key) continue
    for (const model of provider.models()) {
      const left = deadline - Date.now()
      if (attempts >= maxAttempts || left < 2_000) throw new Error(`LLM budget exhausted: ${failures.join('; ')}`)
      attempts++
      try {
        return await attempt(provider, key, model, messages, { timeoutMs: Math.min(attemptTimeoutMs, left), maxTokens })
      } catch (e) {
        failures.push(e.message)
        if (e.status === 401 || e.status === 403) break // bad key: skip this provider's other models
      }
    }
  }
  throw new Error(`All LLM providers failed: ${failures.join('; ') || 'none configured'}`)
}
