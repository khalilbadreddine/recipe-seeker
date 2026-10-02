import React from 'react'
import { Link } from 'react-router-dom'
import NutrientBadge from './NutrientBadge'
import ResponsiveImage from './ResponsiveImage'
import FavoriteButton from './FavoriteButton'
import Icon from './Icon'
import { formatAmount } from '../data/site'
import { prefetchDetail } from '../lib/details'

/**
 * Recipe card. The whole card is clickable through a "stretched" title link
 * (one <a> per card, no nested links); the heart sits above it.
 */
export default function RecipeCard({ recipe, priority = false, maxBadges = 3 }) {
  const to = `/recipes/${recipe.slug}`
  return (
    <article
      data-tilt="5"
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative overflow-hidden">
        <ResponsiveImage
          src={recipe.image}
          alt={recipe.imageAlt}
          loading={priority ? 'eager' : 'lazy'}
          width={800}
          height={600}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
          <Icon name="clock" className="h-3.5 w-3.5" />
          {recipe.totalMinutes} min
        </span>
      </div>
      <FavoriteButton slug={recipe.slug} title={recipe.title} overlay />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/55">
          <Icon name="flame" className="h-3.5 w-3.5" />
          {formatAmount(recipe.calories, 'kcal')}
          <span aria-hidden="true">·</span>
          {recipe.servings} servings
        </p>
        <h3 className="mt-1.5 font-display text-xl font-bold leading-snug text-ink">
          <Link
            to={to}
            onPointerEnter={() => prefetchDetail('recipes', recipe.slug)}
            onFocus={() => prefetchDetail('recipes', recipe.slug)}
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-leaf-dark"
          >
            {recipe.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-pretty text-sm leading-relaxed text-ink/65">{recipe.description}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {recipe.keyNutrients.slice(0, maxBadges).map((b) => {
            const key = b.key || b.id
            return <NutrientBadge key={key} label={b.label} nutrientKey={key} size="sm" />
          })}
        </div>
      </div>
    </article>
  )
}
