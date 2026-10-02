import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsiveImage from './ResponsiveImage'
import Icon from './Icon'
import { getRecipe } from '../data/site'
import { recentRecipes } from '../lib/localPrefs'

/**
 * "Pick up where you left off": the last recipes this visitor opened.
 * Client-only (localStorage), renders nothing for first-time visitors.
 */
export default function RecentlyViewed() {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(recentRecipes().map(getRecipe).filter(Boolean).slice(0, 6))
  }, [])

  if (!items.length) return null

  return (
    <section className="mx-auto mb-16 max-w-7xl px-4 sm:px-6" aria-labelledby="recent-heading">
      <div className="flex items-center gap-2">
        <Icon name="clock" className="h-5 w-5 text-leaf" />
        <h2 id="recent-heading" className="font-display text-xl font-bold text-ink">Pick up where you left off</h2>
      </div>
      <ul className="no-scrollbar snap-row -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {items.map((r) => (
          <li key={r.slug} className="w-64 shrink-0">
            <Link to={`/recipes/${r.slug}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-2 pr-4 hover:border-ink/25 hover:shadow-[var(--shadow-card)]">
              <ResponsiveImage src={r.image} alt="" width={112} height={112} sizes="56px" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-leaf-dark">{r.title}</span>
                <span className="mt-0.5 block text-xs text-ink/55">{r.totalMinutes} min · {r.keyNutrients[0]?.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
