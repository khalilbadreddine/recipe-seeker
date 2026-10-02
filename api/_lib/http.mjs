/**
 * Small HTTP helpers shared by the Vercel functions in /api.
 */

/** Best-effort per-instance rate limiter (resets when the function cold-starts). */
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()
  return function allow(key) {
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs })
      if (hits.size > 5_000) {
        for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
      }
      return true
    }
    entry.count++
    return entry.count <= limit
  }
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

/** Reject cross-site browser calls: these endpoints are only for our own pages. */
export function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true // same-origin GETs and server-to-server calls send no Origin
  const host = req.headers['x-forwarded-host'] || req.headers.host
  try {
    const o = new URL(origin)
    if (o.host === host) return true
    // Local dev: the Vite proxy rewrites Host, so allow localhost when not on Vercel.
    return !process.env.VERCEL && (o.hostname === 'localhost' || o.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 32_000) throw new Error('body too large')
    chunks.push(chunk)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

export function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
