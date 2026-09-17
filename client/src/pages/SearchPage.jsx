import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import RecipeCard from '../components/RecipeCard'
import Reveal from '../components/Reveal'
import { absUrl, nutrients, recipes, formatAmount } from '../data/site'

/**
 * Nutrient filter search. Prerendered with the default (unfiltered) state and
 * a noindex meta - this is a tool page, not an indexable landing page.
 * All filtering is client-side over the prerendered dataset.
 */
export default function SearchPage() {
  const [params] = useSearchParams()
  const [nutrientKey, setNutrientKey] = useState(() => params.get('nutrient') || 'protein')
  const [minAmount, setMinAmount] = useState(() => Number(params.get('min')) || 0)
  const [query, setQuery] = useState(() => params.get('q') || '')
  const [maxTime, setMaxTime] = useState(() => Number(params.get('maxTime')) || 0)

  const nutrient = nutrients.find((n) => n.key === nutrientKey) || nutrients[0]

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      const n = r.nutrition[nutrientKey]
      const amount = n ? n.amount : 0
      const matchesNutrient = minAmount <= 0 || amount >= minAmount
      const matchesTime = maxTime <= 0 || (r.totalMinutes || 0) <= maxTime
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.item.toLowerCase().includes(q)) ||
        r.tags.diets.some((d) => d.toLowerCase().includes(q))
      return matchesNutrient && matchesTime && matchesQuery
    })
  }, [nutrientKey, minAmount, query, maxTime])

  return (
    <>
      <Seo
        title="Search Recipes by Nutrient | The Recipe Seeker"
        description="Filter recipes by nutrient and minimum amount, e.g. iron at 5mg or more per serving. Nutrition-first recipe search."
        canonical={absUrl('/search')}
        noindex
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Reveal as="h1" immediate variant="up" className="font-display text-4xl font-semibold text-forest sm:text-5xl">Search by nutrient</Reveal>
        <Reveal as="p" immediate variant="up" delay={90} className="mt-3 max-w-2xl text-lg text-forest/80">
          Pick a nutrient and a minimum amount per serving, and we’ll show every recipe that meets it.
        </Reveal>

        <div className="mt-8 rounded-[2rem] border border-forest-line bg-cream-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="search-nutrient" className="text-sm font-semibold text-forest">Nutrient</label>
              <select
                id="search-nutrient"
                value={nutrientKey}
                onChange={(e) => setNutrientKey(e.target.value)}
                className="mt-2 w-full rounded-xl border border-forest-line bg-cream px-4 py-3 text-forest outline-none focus:border-ember"
              >
                {nutrients.map((n) => (
                  <option key={n.key} value={n.key}>{n.name} ({n.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="search-min" className="text-sm font-semibold text-forest">
                Minimum per serving: <span className="text-ember-dark">{formatAmount(minAmount, nutrient.unit)}</span>
              </label>
              <input
                id="search-min"
                type="range"
                min={0}
                max={nutrient.key === 'protein' || nutrient.key === 'fiber' ? 40 : 30}
                step={nutrient.unit === 'g' ? 1 : 0.5}
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                className="mt-2 h-10 w-full accent-[#E4572E]"
              />
              <div className="mt-1 flex justify-between text-xs text-forest/75">
                <span>Any</span>
                <span>Daily value: {nutrient.dailyValue}</span>
              </div>
            </div>
            <div>
              <label htmlFor="search-q" className="text-sm font-semibold text-forest">Keyword (optional)</label>
              <input
                id="search-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. salmon, vegan, pasta…"
                className="mt-2 w-full rounded-xl border border-forest-line bg-cream px-4 py-3 text-forest outline-none placeholder:text-forest/90 focus:border-ember"
              />
            </div>
            <div>
              <label htmlFor="search-maxtime" className="text-sm font-semibold text-forest">Max total time</label>
              <select
                id="search-maxtime"
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-forest-line bg-cream px-4 py-3 text-forest outline-none focus:border-ember"
              >
                <option value={0}>Any time</option>
                <option value={15}>15 minutes or less</option>
                <option value={30}>30 minutes or less</option>
                <option value={45}>45 minutes or less</option>
                <option value={60}>60 minutes or less</option>
              </select>
            </div>
          </div>
        </div>

        <p className="mt-8 text-forest/80" role="status">
          <strong className="text-forest">{results.length}</strong>{' '}
          {results.length === 1 ? 'recipe' : 'recipes'} with {minAmount > 0 ? `≥ ${formatAmount(minAmount, nutrient.unit)} ` : ''}{nutrient.name.toLowerCase()} per serving
          {maxTime > 0 && <> ready in {maxTime} minutes or less</>}
          {query.trim() && <> matching “{query.trim()}”</>}.
        </p>

        {results.length > 0 ? (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <Reveal key={r.slug} variant="up" delay={Math.min(i * 50, 300)}>
                <RecipeCard recipe={r} badgeVariant="outline" />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-forest-line bg-cream-card p-10 text-center">
            <p className="font-display text-xl font-semibold text-forest">No recipes match yet</p>
            <p className="mt-2 text-forest/80">
              Try lowering the minimum amount. We’re adding new nutrient-packed recipes every week.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
