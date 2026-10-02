/**
 * /api/unsubscribe?e=<email, base64url>&t=<signature>
 *
 * GET  → unsubscribes and shows a short confirmation page (link in every email).
 * POST → same, for one-click unsubscribe from mail apps (RFC 8058,
 *        List-Unsubscribe-Post header set by the newsletter sender).
 *
 * Needs NEWSLETTER_SECRET (same value as in the GitHub Actions secrets),
 * SUPABASE_URL and SUPABASE_SERVICE_KEY.
 */
import { verifyUnsubscribe } from './_lib/unsubscribeToken.mjs'
import { supabaseConfigured, supabaseRequest } from './_lib/supabase.mjs'

function page(res, status, title, text) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | The Recipe Seeker</title></head>
<body style="margin:0;background:#F6F4EE;color:#16201B;font-family:Inter,system-ui,sans-serif">
<main style="max-width:520px;margin:12vh auto;padding:32px 24px;text-align:center">
<p style="font-weight:800;font-size:20px;margin:0">Recipe<span style="color:#1F7A4A">Seeker</span></p>
<h1 style="font-size:32px;line-height:1.1;margin:28px 0 12px">${title}</h1>
<p style="font-size:17px;line-height:1.6;color:#3d4a42;margin:0">${text}</p>
<p style="margin-top:28px"><a href="/" style="display:inline-block;background:#16201B;color:#F6F4EE;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">Back to recipes</a></p>
</main></body></html>`)
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    return res.end()
  }
  const url = new URL(req.url, 'http://localhost')
  const email = verifyUnsubscribe(url.searchParams.get('e'), url.searchParams.get('t'), process.env.NEWSLETTER_SECRET)
  if (!email) return page(res, 400, 'Link not valid', 'This unsubscribe link is broken or expired. Reply to any of our emails and we’ll remove you by hand.')
  if (!supabaseConfigured()) return page(res, 503, 'Try again later', 'We couldn’t process this right now. Please try again in a few minutes.')

  try {
    const r = await supabaseRequest('PATCH', `/newsletter_subscribers?email=eq.${encodeURIComponent(email)}`, {
      prefer: 'return=minimal',
      body: { unsubscribed_at: new Date().toISOString() },
    })
    if (!r.ok) throw new Error(`supabase HTTP ${r.status}`)
  } catch (e) {
    console.error('[unsubscribe]', e.message)
    return page(res, 502, 'Try again later', 'We couldn’t process this right now. Please try again in a few minutes.')
  }
  if (req.method === 'POST') {
    res.statusCode = 200
    return res.end('ok')
  }
  return page(res, 200, 'You’re unsubscribed', `${email.replace(/[<>&"]/g, '')} won’t get our weekly email anymore. Changed your mind? You can sign up again any time at the bottom of the site.`)
}
