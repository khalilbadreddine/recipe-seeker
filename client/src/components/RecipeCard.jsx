import React from 'react'
import { Link } from 'react-router-dom'
import NutrientBadge from './NutrientBadge'
import ResponsiveImage from './ResponsiveImage'
import FavoriteButton from './FavoriteButton'
import { getNutrient } from '../data/site'

/** Editorial recipe card: image, serif title, description, nutrient badge row. */
export default function RecipeCard({ recipe, badgeVariant = 'solid' }) {
  const to = `/recipes/${recipe.slug}`
  return (
    <article className="group relative overflow-hidden rounded-3xl bg-cream-card shadow-[0_8px_30px_rgba(30,70,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,70,51,0.14)]">
      <FavoriteButton slug={recipe.slug} title={recipe.title} overlay />
      <Link to={to} className="block">
        <div className="relative overflow-hidden">
          <ResponsiveImage
            src={recipe.image}
            alt={recipe.imageAlt}
            loading="lazy"
            width={800}
            height={533}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
        <div className="px-6 pb-6 pt-5 text-center">
          <h3 className="font-display text-[22px] font-semibold leading-snug text-forest group-hover:text-ember-dark">
            {recipe.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-pretty text-sm text-forest/80">{recipe.description}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {recipe.keyNutrients.map((b) => {
              // Newer recipes use `id`; older ones use `key`. Accept both.
              const badgeKey = b.key || b.id
              const nutrient = getNutrient(badgeKey)
              return (
                <NutrientBadge
                  key={badgeKey}
                  label={b.label}
                  variant={badgeVariant}
                  to={nutrient ? `/nutrients/${nutrient.slug || nutrient.key}` : undefined}
                />
              )
            })}
          </div>
        </div>
      </Link>
    </article>
  )
}
