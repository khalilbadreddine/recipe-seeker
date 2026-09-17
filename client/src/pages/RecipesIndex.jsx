import React, { useState } from 'react'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import RecipeCard from '../components/RecipeCard'
import { absUrl, absImage, recipes } from '../data/site'

const PAGE_SIZE = 12

export default function RecipesIndex() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = recipes.slice(0, visibleCount)

  const canonical = absUrl('/recipes')
  const title = 'All Recipes | The Recipe Seeker'
  const description =
    'Browse every nutrition-first recipe on The Recipe Seeker — high-protein, iron-rich, high-fiber and more, each with real per-serving nutrition data.'

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

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[collectionLd, itemListLd, breadcrumbLd]} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Recipes' }]} />

        <Reveal as="p" immediate variant="up" className="mt-6 text-sm font-semibold uppercase tracking-widest text-ember-dark">
          The Collection
        </Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          All {recipes.length} recipes
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={160} className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/80">
          Every recipe, searchable by what your body needs. Each one lists real
          per-serving nutrition — protein, iron, fiber, vitamins and more.
        </Reveal>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r, i) => (
            <Reveal key={r.slug} variant="up" delay={Math.min((i % PAGE_SIZE) * 60, 360)}>
              <RecipeCard recipe={r} />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          {visibleCount < recipes.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="inline-flex items-center gap-2 rounded-full bg-ember-dark px-8 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Load more recipes
              <span aria-hidden="true">↓</span>
            </button>
          ) : (
            <p className="text-forest/75">You've seen them all — happy cooking.</p>
          )}
          <p className="mt-3 text-sm text-forest/75" aria-live="polite">
            Showing {visible.length} of {recipes.length} recipes
          </p>
        </div>
      </div>
    </>
  )
}
