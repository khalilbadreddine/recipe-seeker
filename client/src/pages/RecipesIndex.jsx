import React, { useMemo, useState } from 'react'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import RecipeCard from '../components/RecipeCard'
import Icon from '../components/Icon'
import { absUrl, absImage, recipes } from '../data/site'
import { DIET_LABELS, MEAL_LABELS } from '../data/nutrientMeta'

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'protein', label: 'Most protein' },
  { id: 'fiber', label: 'Most fiber' },
  { id: 'quick', label: 'Quickest' },
  { id: 'light', label: 'Fewest calories' },
]

const amount = (r, k) => r.nutrition[k]?.amount || 0

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[40px] whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
        active ? 'bg-ink text-paper' : 'border border-line bg-card text-ink/75 hover:border-ink/30 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export default function RecipesIndex() {
  const [meal, setMeal] = useState('')
  const [diet, setDiet] = useState('')
  const [sort, setSort] = useState('featured')

  const meals = useMemo(() => Object.keys(MEAL_LABELS).filter((m) => recipes.some((r) => r.tags.meals.includes(m))), [])
  const diets = useMemo(() => Object.keys(DIET_LABELS).filter((d) => recipes.some((r) => r.tags.diets.includes(d))), [])

  const visible = useMemo(() => {
    const list = recipes.filter((r) => (!meal || r.tags.meals.includes(meal)) && (!diet || r.tags.diets.includes(diet)))
    const sorted = [...list]
    if (sort === 'newest') sorted.sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''))
    if (sort === 'protein') sorted.sort((a, b) => amount(b, 'protein') - amount(a, 'protein'))
    if (sort === 'fiber') sorted.sort((a, b) => amount(b, 'fiber') - amount(a, 'fiber'))
    if (sort === 'quick') sorted.sort((a, b) => (a.totalMinutes || 0) - (b.totalMinutes || 0))
    if (sort === 'light') sorted.sort((a, b) => (a.calories || 0) - (b.calories || 0))
    return sorted
  }, [meal, diet, sort])

  const canonical = absUrl('/recipes')
  const title = 'All Recipes | The Recipe Seeker'
  const description =
    'Browse every nutrition-first recipe on The Recipe Seeker: high-protein, iron-rich, high-fiber and more, each with real per-serving nutrition data.'

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Recipes',
    description,
    url: canonical,
  }
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All recipes',
    itemListElement: recipes.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(`/recipes/${r.slug}`),
      name: r.title,
      image: absImage(r.image),
    })),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: canonical },
    ],
  }

  const filtered = meal || diet

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[collectionLd, itemListLd, breadcrumbLd]} />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Recipes' }]} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">
              The collection
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={60} className="mt-2 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
              All {recipes.length} recipes
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={120} className="mt-4 text-lg leading-relaxed text-ink/65">
              Every recipe lists real per-serving nutrition: protein, iron, fiber, vitamins and more. Filter by meal or diet, or sort by what matters to you.
            </Reveal>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-30 -mx-4 mt-8 border-y border-line bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-[72px]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex w-max items-center gap-2" role="group" aria-label="Filter by meal and diet">
                <Chip active={!meal && !diet} onClick={() => { setMeal(''); setDiet('') }}>All</Chip>
                {meals.map((m) => (
                  <Chip key={m} active={meal === m} onClick={() => setMeal(meal === m ? '' : m)}>{MEAL_LABELS[m]}</Chip>
                ))}
                <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
                {diets.map((d) => (
                  <Chip key={d} active={diet === d} onClick={() => setDiet(diet === d ? '' : d)}>{DIET_LABELS[d]}</Chip>
                ))}
              </div>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink/60">
              <Icon name="list" className="h-4 w-4" />
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-[40px] rounded-full border border-line bg-card px-4 font-semibold text-ink outline-none focus:border-ink/40"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="mt-6 text-sm text-ink/60" role="status">
          Showing <strong className="text-ink">{visible.length}</strong> of {recipes.length} recipes
          {filtered && (
            <button type="button" onClick={() => { setMeal(''); setDiet('') }} className="ml-2 font-semibold text-ink underline underline-offset-2">
              Clear filters
            </button>
          )}
        </p>

        {visible.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((r, i) => (
              <Reveal key={r.slug} variant="up" delay={Math.min((i % 8) * 50, 300)}>
                <RecipeCard recipe={r} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-card px-6 py-14 text-center">
            <p className="font-display text-2xl font-bold text-ink">No recipes match that combo yet</p>
            <p className="mt-2 text-ink/60">Try removing a filter. New recipes are added every week.</p>
          </div>
        )}
      </div>
    </>
  )
}
