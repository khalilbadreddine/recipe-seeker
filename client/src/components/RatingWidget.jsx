import React, { useEffect, useState } from 'react'

/**
 * Real user rating widget (1-5 stars), persisted to localStorage per recipe slug.
 * Deliberately NO aggregateRating is fabricated - schema stays clean.
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
      /* storage unavailable - widget still works for this session */
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

  return (
    <div className="rounded-2xl border border-forest-line bg-cream-card px-5 py-5">
      <h2 className="font-display text-xl font-semibold text-forest">Tried this recipe?</h2>
      <p className="mt-1 text-sm text-forest/80">Tap a star to rate {title ? `“${title}”` : 'it'}.</p>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rate this recipe">
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
              className="p-1 transition hover:scale-110"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-9 w-9 sm:h-8 sm:w-8 ${active ? 'text-ember' : 'text-forest-line'}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
              </svg>
            </button>
          )
        })}
      </div>
      <p className="mt-2 min-h-5 text-sm text-forest/80" aria-live="polite">
        {saved && rating > 0
          ? `Thanks! You rated this ${rating} out of 5.`
          : 'Your rating is saved on this device only.'}
      </p>
    </div>
  )
}
