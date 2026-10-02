import React, { useEffect, useState } from 'react'

// One availability check per page load, shared by every form instance.
let enabledPromise = null
function checkEnabled() {
  if (!enabledPromise) {
    enabledPromise = fetch('/api/subscribe')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((b) => Boolean(b.enabled))
      .catch(() => false)
  }
  return enabledPromise
}

/**
 * Newsletter signup → POST /api/subscribe (Supabase via a Vercel function).
 * Renders nothing until the backend reports it is configured, so visitors
 * never see a form that can't work. `dark` styles it for ink backgrounds.
 */
export default function NewsletterSignup({ dark = false, id = 'newsletter-email', source = 'website', children }) {
  const [enabled, setEnabled] = useState(false)
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    checkEnabled().then((ok) => alive && setEnabled(ok))
    return () => {
      alive = false
    }
  }, [])

  if (!enabled) return null

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source, company }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setStatus('success')
      setMessage('You’re in! Watch your inbox for new recipes.')
    } catch (err) {
      setStatus('error')
      setMessage(err.message && !err.message.startsWith('HTTP') ? err.message : 'Something went wrong. Please try again in a moment.')
    }
  }

  return (
    <div>
      {children}
      {status === 'success' ? (
        <p className={`mt-4 flex items-center gap-2 font-semibold ${dark ? 'text-paper' : 'text-ink'}`} role="status">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-zest text-ink">✓</span>
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 max-w-md" aria-label="Newsletter signup">
          <div className={`flex items-center gap-2 rounded-full p-1.5 ${dark ? 'bg-paper/10 ring-1 ring-paper/20' : 'border border-line bg-card'}`}>
            <label htmlFor={id} className="sr-only">Email address</label>
            <input
              id={id}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              disabled={status === 'sending'}
              className={`min-w-0 flex-1 bg-transparent px-4 py-2.5 text-base outline-none ${
                dark ? 'text-paper placeholder:text-paper/50' : 'text-ink placeholder:text-ink/40'
              }`}
            />
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="min-h-[44px] shrink-0 rounded-full bg-zest px-5 text-sm font-bold text-ink hover:brightness-95 disabled:opacity-60"
            >
              {status === 'sending' ? 'Joining…' : 'Subscribe'}
            </button>
          </div>
          {status === 'error' && (
            <p className={`mt-2 text-sm ${dark ? 'text-tomato-soft' : 'text-tomato-dark'}`} role="alert">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
