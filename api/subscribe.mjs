/**
 * /api/subscribe: newsletter signups → Supabase `newsletter_subscribers`.
 *
 *   GET  → { enabled: boolean }   (the form only renders when true)
 *   POST { email, source?, company? } → 200 { ok: true }
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_KEY in the Vercel project env and the
 * table from supabase/site-features.sql. The service key stays on the server;
 * RLS on the table has no policies, so browsers can't read the list.
 *
 * Duplicate emails also return ok (we never reveal who is subscribed).
 * `company` is a honeypot field: bots that fill it get a fake success.
 */
import { createRateLimiter, clientIp, sameOrigin, readJson, send } from './_lib/http.mjs'
import { supabaseConfigured, supabaseRequest } from './_lib/supabase.mjs'

const allow = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req, res) {
  const enabled = supabaseConfigured()

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
    const r = await supabaseRequest('POST', '/newsletter_subscribers?on_conflict=email', {
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: { email, source, unsubscribed_at: null },
    })
    if (!r.ok) throw new Error(`supabase HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return send(res, 200, { ok: true })
  } catch (e) {
    console.error('[subscribe]', e.message)
    return send(res, 502, { error: 'Something went wrong. Please try again in a moment.' })
  }
}
