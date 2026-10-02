/**
 * /api/subscribe: newsletter signups → Supabase `newsletter_subscribers`.
 *
 *   GET  → { enabled: boolean }   (the form only renders when true)
 *   POST { email, source?, company? } → 200 { ok: true }
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_KEY in the Vercel project env and the
 * table from supabase/newsletter.sql. The service key stays on the server;
 * RLS on the table has no policies, so browsers can't read the list.
 *
 * Duplicate emails also return ok (we never reveal who is subscribed).
 * `company` is a honeypot field: bots that fill it get a fake success.
 */
import { createRateLimiter, clientIp, sameOrigin, readJson, send } from './_lib/http.mjs'

const allow = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const config = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY })

export default async function handler(req, res) {
  const { url, key } = config()
  const enabled = Boolean(url && key)

  if (req.method === 'GET') return send(res, 200, { enabled })
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  if (!sameOrigin(req)) return send(res, 403, { error: 'forbidden' })
  if (!enabled) return send(res, 503, { error: 'Signups are not open yet.' })
  if (!allow(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Please try again later.' })

  let body
  try {
    body = await readJson(req)
  } catch {
    return send(res, 400, { error: 'invalid JSON' })
  }
  if (body?.company) return send(res, 200, { ok: true })

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !EMAIL_RE.test(email)) return send(res, 400, { error: 'Please enter a valid email address.' })
  const source = typeof body?.source === 'string' ? body.source.slice(0, 40) : 'website'

  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/newsletter_subscribers?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ email, source }),
    })
    if (!r.ok) throw new Error(`supabase HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return send(res, 200, { ok: true })
  } catch (e) {
    console.error('[subscribe]', e.message)
    return send(res, 502, { error: 'Something went wrong. Please try again in a moment.' })
  }
}
