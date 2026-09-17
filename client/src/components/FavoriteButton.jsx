import React from 'react'
import { useFavorites } from '../context/FavoritesContext'

/** Heart icon: filled ember when saved, outline when not. */
function HeartIcon({ filled, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.3a5 5 0 1 1 7.5 6.3z" />
    </svg>
  )
}

/**
 * FavoriteButton — heart toggle for saving a recipe.
 * `overlay` styles it as a floating button over card images.
 */
export default function FavoriteButton({ slug, title = 'recipe', overlay = false, className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const saved = isFavorite(slug)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(slug)
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved recipes` : `Save ${title} to your recipes`}
      title={saved ? 'Saved' : 'Save recipe'}
      className={
        overlay
          ? `absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/95 text-ember-dark shadow-md backdrop-blur transition hover:scale-105 ${className}`
          : `inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              saved
                ? 'border-ember-dark bg-ember-dark text-white'
                : 'border-forest/25 bg-cream-card text-forest hover:border-ember-dark hover:text-ember-dark'
            } ${className}`
      }
    >
      <span className={overlay ? (saved ? 'text-ember' : 'text-forest/60') : ''}>
        <HeartIcon filled={saved} />
      </span>
      {!overlay && (saved ? 'Saved' : 'Save recipe')}
    </button>
  )
}
