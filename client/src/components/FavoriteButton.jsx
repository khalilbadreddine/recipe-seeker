import React from 'react'
import { useFavorites } from '../context/FavoritesContext'
import Icon from './Icon'

/**
 * FavoriteButton — heart toggle for saving a recipe.
 * `overlay` floats it over a card image (above the card's stretched link).
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
          ? `absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur hover:scale-110 ${
              saved ? 'text-tomato' : 'text-ink/70'
            } ${className}`
          : `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold ${
              saved
                ? 'border-tomato bg-tomato text-white'
                : 'border-line bg-card text-ink hover:border-tomato hover:text-tomato-dark'
            } ${className}`
      }
    >
      <Icon name="heart" filled={saved} className="h-5 w-5" strokeWidth={2} />
      {!overlay && (saved ? 'Saved' : 'Save')}
    </button>
  )
}
