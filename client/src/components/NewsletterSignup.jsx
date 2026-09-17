import React, { useState } from 'react'

/**
 * Newsletter signup. POSTs to /api/subscribe (Express + SQLite, sibling agent's API).
 * In dev, vite proxies /api → http://localhost:3001.
 * Shows sending / success / error states; never throws.
 */
export default function NewsletterSignup({ compact = false }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'website' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('success')
      setMessage('You’re in! Watch your inbox for weekly recipes.')
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again in a moment.')
    }
  }

  if (status === 'success') {
    return (
      <p className={`flex items-center gap-2 font-medium text-forest ${compact ? 'mt-3 text-sm text-cream' : 'mt-4'}`} role="status">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-cream">✓</span>
        {message}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={compact ? 'mt-3' : 'mt-6'} aria-label="Newsletter signup">
      <div
        className={`flex items-center gap-2 rounded-full p-1.5 ${
          compact ? 'bg-cream/10' : 'border border-forest-line bg-cream-card shadow-sm'
        }`}
      >
        <label htmlFor={compact ? 'newsletter-email-footer' : 'newsletter-email'} className="sr-only">
          Email address
        </label>
        <input
          id={compact ? 'newsletter-email-footer' : 'newsletter-email'}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email…"
          disabled={status === 'sending'}
          className={`w-full bg-transparent px-4 py-2.5 text-base outline-none placeholder:text-forest/90 sm:text-[15px] ${
            compact ? 'text-cream placeholder:text-cream/70' : 'text-forest'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="shrink-0 rounded-full bg-ember-dark px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          {status === 'sending' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className={`mt-2 text-sm ${compact ? 'text-ember-soft' : 'text-ember-dark'}`} role="alert">
          {message}
        </p>
      )}
    </form>
  )
}
