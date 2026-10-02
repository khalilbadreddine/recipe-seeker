import React, { useState } from 'react'
import Seo from '../components/Seo'
import Icon from '../components/Icon'
import { absUrl } from '../data/site'

const CONTACT_EMAIL = 'hello@therecipeseeker.com'

export default function ContactPage() {
  const canonical = absUrl('/contact')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Message from ${name || 'a Recipe Seeker reader'}`)
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  const inputCls =
    'w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-ink placeholder:text-ink/35 focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-zest/60'

  return (
    <>
      <Seo
        title="Contact Us | The Recipe Seeker"
        description="Get in touch with The Recipe Seeker: questions about a recipe, feedback, or just saying hello. We'd love to hear from you."
        canonical={canonical}
      />
      <article className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">Contact</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">Get in touch</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            Questions about a recipe, spotted a typo, or just want to say hello? We'd love to hear
            from you. The form opens your email app with your message ready to send.
          </p>
          <div className="mt-8 rounded-[2rem] bg-ink px-6 py-6 text-paper">
            <p className="flex items-center gap-2 text-sm text-paper/60">
              <Icon name="mail" className="h-4 w-4" /> Prefer to write directly?
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block break-all font-display text-2xl font-bold text-zest hover:underline">
              {CONTACT_EMAIL}
            </a>
            <p className="mt-2 text-xs text-paper/50">Currently a placeholder address until our real inbox is set up.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-line bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-ink">Your name</label>
            <input id="contact-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required className={inputCls} />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-ink">Your email</label>
            <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required className={inputCls} />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-ink">Message</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              rows={6}
              required
              className={`${inputCls} resize-y`}
            />
          </div>
          <button type="submit" className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ink px-7 font-bold text-paper hover:bg-leaf-dark sm:w-auto">
            Send via email <Icon name="arrowRight" className="h-4 w-4" />
          </button>
          <p className="text-xs text-ink/55">
            Submitting opens your email app with the message pre-filled. We don't store form data on our servers. See our{' '}
            <a href="/privacy" className="underline hover:text-ink">privacy policy</a>.
          </p>
        </form>
      </article>
    </>
  )
}
