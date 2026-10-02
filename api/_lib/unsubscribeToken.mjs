/**
 * Signed unsubscribe links: HMAC-SHA256(NEWSLETTER_SECRET, email).
 * Shared by api/unsubscribe.mjs (verifies) and
 * pipeline/scripts/newsletter-weekly.mjs (builds the links).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

export function unsubscribeToken(email, secret) {
  return b64url(createHmac('sha256', secret).update(email.toLowerCase()).digest())
}

export function unsubscribeUrl(siteUrl, email, secret) {
  return `${siteUrl.replace(/\/$/, '')}/api/unsubscribe?e=${b64url(email.toLowerCase())}&t=${unsubscribeToken(email, secret)}`
}

/** Returns the email if the (e, t) pair is valid, else null. */
export function verifyUnsubscribe(e, t, secret) {
  if (!e || !t || !secret) return null
  let email
  try {
    email = fromB64url(e).toLowerCase()
  } catch {
    return null
  }
  const expected = Buffer.from(unsubscribeToken(email, secret))
  const given = Buffer.from(String(t))
  return expected.length === given.length && timingSafeEqual(expected, given) ? email : null
}
