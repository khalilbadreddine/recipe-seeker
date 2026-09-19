/**
 * llm.mjs — free-tier LLM client with provider fallback.
 *
 * Khalil's provider order (first configured+working wins):
 *   1. xAI Grok        (XAI_API_KEY)        — $25 signup credits, no card
 *   2. OpenRouter      (OPENROUTER_API_KEY) — :free models, no card
 *   3. NVIDIA NIM      (NVIDIA_API_KEY)     — free credits, no card
 *   4. Google Gemini   (GEMINI_API_KEY)     — free tier, LAST by choice
 *
 * All four speak the OpenAI /v1/chat/completions dialect, so one code path
 * serves them all. On rate-limit (429), auth (401/403), quota (402),
 * server error (5xx), or network failure, the client falls through to the
 * next provider. It throws only when every configured provider failed.
 *
 * Usage:
 *   import { chat } from './lib/llm.mjs';
 *   const { text, provider, model } = await chat(systemPrompt, userPrompt);
 *
 * Env:
 *   XAI_API_KEY, XAI_MODEL (default: grok-4-1-fast)
 *   OPENROUTER_API_KEY
 *   NVIDIA_API_KEY, NVIDIA_MODEL (default: nvidia/llama-3.1-nemotron-70b-instruct)
 *   GEMINI_API_KEY  (uses the OpenAI-compatible Gemini endpoint)
 *   SITE_URL (sent as HTTP-Referer to OpenRouter; optional)
 */

const SITE_URL = process.env.SITE_URL || 'https://recipe-seeker-client.vercel.app';

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
    // :free models rotate/die without warning — try several in order.
    models: () => [
      'openai/gpt-oss-120b:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-26b-a4b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ],
    headers: () => ({
      'HTTP-Referer': SITE_URL,
      'X-Title': 'Recipe Seeker Pipeline',
    }),
  },
  {
    id: 'nvidia',
    keyEnv: 'NVIDIA_API_KEY',
    base: 'https://integrate.api.nvidia.com/v1',
    models: () => [process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct'],
  },
  {
    id: 'gemini',
    keyEnv: 'GEMINI_API_KEY',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: () => ['gemini-2.0-flash'],
  },
];

function isRetryable(status) {
  return status === 429 || status === 402 || status === 408 || (status >= 500 && status < 600);
}

async function tryOnce(provider, key, model, system, user, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 90_000);
  try {
    const res = await fetch(`${provider.base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        ...(provider.headers ? provider.headers() : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4000,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      const err = new Error(`${provider.id}/${model} -> HTTP ${res.status}: ${body}`);
      err.status = res.status;
      throw err;
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error(`${provider.id}/${model} -> empty response`);
    return { text, provider: provider.id, model };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Chat through the fallback chain. Returns { text, provider, model }.
 * opts: { temperature, maxTokens, json, timeoutMs, log }
 */
export async function chat(system, user, opts = {}) {
  const failures = [];
  for (const provider of PROVIDERS) {
    const key = process.env[provider.keyEnv];
    if (!key) {
      failures.push(`${provider.id}: no ${provider.keyEnv} configured (skipped)`);
      continue;
    }
    for (const model of provider.models()) {
      try {
        const out = await tryOnce(provider, key, model, system, user, opts);
        if (opts.log) opts.log(`[llm] served by ${out.provider}/${out.model}`);
        return out;
      } catch (e) {
        failures.push(`${provider.id}/${model}: ${e.message}`);
        // Auth errors mean the key itself is bad — don't burn the other
        // models on this provider, move to the next provider.
        if (e.status === 401 || e.status === 403) break;
        if (!isRetryable(e.status) && e.status !== undefined) {
          // Non-retryable client error on this model — try next model.
          continue;
        }
      }
    }
  }
  throw new Error(`All LLM providers failed:\n- ${failures.join('\n- ')}`);
}

/** Which providers have keys configured (for diagnostics, no secrets). */
export function configuredProviders() {
  return PROVIDERS.filter((p) => process.env[p.keyEnv]).map((p) => p.id);
}
