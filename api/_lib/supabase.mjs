/**
 * Tiny server-side Supabase REST helper for the Vercel functions.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_KEY (never exposed to the browser).
 */

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
}

/**
 * Call PostgREST. `path` like '/newsletter_subscribers?on_conflict=email'.
 * Returns the fetch Response; throws on network errors or timeout.
 */
export async function supabaseRequest(method, path, { body, prefer, timeoutMs = 5000 } = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_KEY
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(`${url}/rest/v1${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Remove things that look like personal data before storing free text. */
export function scrubText(text, max = 300) {
  return String(text || '')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
