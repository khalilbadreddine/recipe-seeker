import React, { useEffect, useState } from 'react'

/**
 * Real user rating widget (1-5 stars), persisted to localStorage per recipe slug.
 * Deliberately NO aggregateRating is fabricated, schema stays clean.
 * SSR-safe: reads localStorage only after mount.
 */
export default function RatingWidget({ slug, title }) {
  const storageKey = `trs-rating:${slug}`
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(storageKey))
      if (stored >= 1 && stored <= 5) {
        setRating(stored)
        setSaved(true)
      }
    } catch {
      /* storage unavailable, widget still works for this session */
    }
  }, [storageKey])

  const choose = (value) => {
    setRating(value)
    setSaved(true)
    try {
      window.localStorage.setItem(storageKey, String(value))
    } catch {
      /* ignore */
    }
  }

  const labels = ['', 'Not for me', 'It was OK', 'Good', 'Really good', 'Loved it!']

  return (
    <div className="no-print rounded-3xl bg-zest-soft px-6 py-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Made it? Rate it.</h2>
        <p className="mt-1 text-sm text-ink/65">Tap a star to rate {title ? `“${title}”` : 'this recipe'}.</p>
      </div>
      <div className="mt-4 sm:mt-0 sm:text-right">
        <div className="flex items-center gap-1 sm:justify-end" role="radiogroup" aria-label="Rate this recipe">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= (hover || rating)
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value > 1 ? 's' : ''}`}
                onClick={() => choose(value)}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onFocus={() => setHover(value)}
                onBlur={() => setHover(0)}
                className="p-1 hover:scale-110"
              >
                <svg viewBox="0 0 24 24" className={`h-9 w-9 ${active ? 'text-ink' : 'text-ink/15'}`} fill="currentColor" aria-hidden="true">
                  <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
                </svg>
              </button>
            )
          })}
        </div>
        <p className="mt-1 min-h-5 text-sm font-medium text-ink/70" aria-live="polite">
          {hover ? labels[hover] : saved && rating > 0 ? `Thanks! You rated it ${rating}/5.` : 'Saved on this device only.'}
        </p>
      </div>
    </div>
  )
}
