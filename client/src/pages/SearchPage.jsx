import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import RecipeCard from '../components/RecipeCard'
import Reveal from '../components/Reveal'
import Icon from '../components/Icon'
import { absUrl, nutrients, recipes, formatAmount } from '../data/site'
import { nutrientMeta, tint } from '../data/nutrientMeta'

const TIMES = [
  { v: 0, label: 'Any' },
  { v: 15, label: '≤ 15 min' },
  { v: 30, label: '≤ 30 min' },
  { v: 45, label: '≤ 45 min' },
  { v: 60, label: '≤ 60 min' },
]

/**
 * Nutrient filter search. Prerendered with the default (unfiltered) state and
 * a noindex meta: this is a tool page, not an indexable landing page.
 * All filtering is client-side over the prerendered dataset.
 */
export default function SearchPage() {
  const [params] = useSearchParams()
  const [nutrientKey, setNutrientKey] = useState(() => params.get('nutrient') || 'protein')
  const [minAmount, setMinAmount] = useState(() => Number(params.get('min')) || 0)
  const [query, setQuery] = useState(() => params.get('q') || '')
  const [maxTime, setMaxTime] = useState(() => Number(params.get('maxTime')) || 0)

  const nutrient = nutrients.find((n) => n.key === nutrientKey) || nutrients[0]
  const meta = nutrientMeta(nutrient.key)
  const sliderMax = nutrient.key === 'protein' || nutrient.key === 'fiber' ? 40 : 30

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes
      .filter((r) => {
        const n = r.nutrition[nutrientKey]
        const amount = n ? n.amount : 0
        const matchesNutrient = minAmount <= 0 || amount >= minAmount
        const matchesTime = maxTime <= 0 || (r.totalMinutes || 0) <= maxTime
        const matchesQuery =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.item.toLowerCase().includes(q)) ||
          r.tags.diets.some((d) => d.toLowerCase().includes(q)) ||
          r.tags.meals.some((m) => m.toLowerCase().includes(q))
        return matchesNutrient && matchesTime && matchesQuery
      })
      .sort((a, b) => (minAmount > 0 ? (b.nutrition[nutrientKey]?.amount || 0) - (a.nutrition[nutrientKey]?.amount || 0) : 0))
  }, [nutrientKey, minAmount, query, maxTime])

  const reset = () => {
    setMinAmount(0)
    setQuery('')
    setMaxTime(0)
  }

  return (
    <>
      <Seo
        title="Search Recipes by Nutrient | The Recipe Seeker"
        description="Filter recipes by nutrient and minimum amount, e.g. iron at 5mg or more per serving. Nutrition-first recipe search."
        canonical={absUrl('/search')}
        noindex
      />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10">
        <Reveal as="h1" immediate variant="up" className="font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
          Search by nutrient
        </Reveal>
        <Reveal as="p" immediate variant="up" delay={60} className="mt-3 max-w-2xl text-lg text-ink/65">
          Pick a nutrient and a minimum per serving, and we’ll show every recipe that meets it.
        </Reveal>

        <Reveal immediate variant="up" delay={120} className="mt-8 rounded-[2rem] border border-line bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
          <label htmlFor="search-q" className="sr-only">Keyword</label>
          <div className="flex items-center gap-2 rounded-full bg-mist px-4 focus-within:ring-2 focus-within:ring-leaf">
            <Icon name="search" className="h-5 w-5 shrink-0 text-ink/40" />
            <input
              id="search-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keyword: salmon, vegan, pasta, breakfast…"
              className="min-h-[52px] min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/40 focus-visible:outline-none"
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-ink">Nutrient</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {nutrients.map((n) => {
                const on = n.key === nutrientKey
                const c = nutrientMeta(n.key).color
                return (
                  <button
                    key={n.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setNutrientKey(n.key)
                      setMinAmount(0)
                    }}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-sm font-semibold ${on ? 'text-white' : 'text-ink hover:brightness-95'}`}
                    style={{ backgroundColor: on ? c : tint(c, 0.12) }}
                  >
                    {!on && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} aria-hidden="true" />}
                    {n.name}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <label htmlFor="search-min" className="flex items-baseline justify-between text-sm font-semibold text-ink">
                <span>Minimum per serving</span>
                <span className="font-display text-xl font-extrabold" style={{ color: meta.color }}>
                  {minAmount > 0 ? formatAmount(minAmount, nutrient.unit) : 'Any'}
                </span>
              </label>
              <input
                id="search-min"
                type="range"
                min={0}
                max={sliderMax}
                step={nutrient.unit === 'g' ? 1 : 0.5}
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                className="mt-2 h-10 w-full"
                style={{ accentColor: meta.color }}
              />
              <p className="text-xs text-ink/55">Daily value: {nutrient.dailyValue}</p>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Total time</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    aria-pressed={maxTime === t.v}
                    onClick={() => setMaxTime(t.v)}
                    className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${
                      maxTime === t.v ? 'bg-ink text-paper' : 'border border-line text-ink/70 hover:border-ink/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink/70" role="status">
            <strong className="font-display text-2xl font-extrabold text-ink">{results.length}</strong>{' '}
            {results.length === 1 ? 'recipe' : 'recipes'}
            {minAmount > 0 && <> with ≥ {formatAmount(minAmount, nutrient.unit)} {nutrient.name.toLowerCase()} per serving</>}
            {maxTime > 0 && <>, ready in {maxTime} min or less</>}
            {query.trim() && <> matching “{query.trim()}”</>}
          </p>
          {(minAmount > 0 || maxTime > 0 || query) && (
            <button type="button" onClick={reset} className="text-sm font-semibold text-ink underline underline-offset-2">
              Reset filters
            </button>
          )}
        </div>

        {results.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r, i) => (
              <Reveal key={r.slug} variant="up" delay={Math.min((i % 8) * 40, 280)}>
                <RecipeCard recipe={r} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-card px-6 py-14 text-center">
            <p className="font-display text-2xl font-bold text-ink">No recipes match yet</p>
            <p className="mt-2 text-ink/60">Try lowering the minimum amount. New nutrient-packed recipes are added every week.</p>
          </div>
        )}
      </div>
    </>
  )
}
