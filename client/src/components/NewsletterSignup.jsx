import React, { useState } from 'react'

/**
 * Newsletter signup. POSTs to /api/subscribe.
 * Shows sending / success / error states; never throws.
 * `dark` styles it for ink backgrounds.
 */
export default function NewsletterSignup({ dark = false, id = 'newsletter-email' }) {
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
      <p className={`mt-5 flex items-center gap-2 font-semibold ${dark ? 'text-paper' : 'text-ink'}`} role="status">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-zest text-ink">✓</span>
        {message}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 max-w-md" aria-label="Newsletter signup">
      <div className={`flex items-center gap-2 rounded-full p-1.5 ${dark ? 'bg-paper/10 ring-1 ring-paper/20' : 'border border-line bg-card'}`}>
        <label htmlFor={id} className="sr-only">Email address</label>
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={status === 'sending'}
          className={`min-w-0 flex-1 bg-transparent px-4 py-2.5 text-base outline-none ${
            dark ? 'text-paper placeholder:text-paper/50' : 'text-ink placeholder:text-ink/40'
          }`}
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
  )
}
