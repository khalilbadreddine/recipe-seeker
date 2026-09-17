import React, { useState } from 'react'
import Seo from '../components/Seo'
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
    'w-full rounded-xl border border-forest/20 bg-white px-4 py-3 text-forest placeholder:text-forest/40 focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30'

  return (
    <>
      <Seo
        title="Contact Us | The Recipe Seeker"
        description="Get in touch with The Recipe Seeker — questions about a recipe, feedback, or just saying hello. We'd love to hear from you."
        canonical={canonical}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-forest sm:text-5xl">Get in touch</h1>
        <p className="mt-4 leading-relaxed text-forest/80">
          Questions about a recipe, spotted a typo, or just want to say hello? We'd love to hear
          from you. The fastest way is the form below — it opens your email app with your message
          ready to send.
        </p>

        <div className="mt-6 rounded-2xl bg-forest px-6 py-5 text-cream">
          <p className="text-sm text-cream/70">Prefer to write directly? Reach us at</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="break-all font-display text-xl font-semibold text-cream underline decoration-ember decoration-2 underline-offset-4 hover:text-ember"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-1 text-xs text-cream/60">Currently a placeholder address until our real inbox is set up.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-forest">
              Your name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-forest">
              Your email
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-forest">
              Message
            </label>
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
          <button
            type="submit"
            className="w-full rounded-full bg-ember-dark px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 sm:w-auto"
          >
            Send via email
          </button>
          <p className="text-xs text-forest/75">
            Submitting opens your email app with the message pre-filled — we don't store form
            data on our servers. See our <a href="/privacy" className="underline hover:text-ember">privacy policy</a>.
          </p>
        </form>
      </article>
    </>
  )
}
