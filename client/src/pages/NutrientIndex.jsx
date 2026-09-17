import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Reveal from '../components/Reveal'
import NutrientIcon from '../components/NutrientIcon'
import { absUrl, nutrients } from '../data/site'

/**
 * /nutrients — index of all 12 nutrient hubs. Prerendered, indexable.
 */
export default function NutrientIndex() {
  const canonical = absUrl('/nutrients')
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Nutrients',
    description: 'Browse recipes by the nutrient your body needs.',
    itemListElement: nutrients.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(`/nutrients/${n.slug || n.key}`),
      name: n.name,
    })),
  }

  return (
    <>
      <Seo
        title="Browse Recipes by Nutrient | The Recipe Seeker"
        description="Find recipes by what your body needs: iron, protein, fiber, vitamin C, calcium, zinc and more — with per-serving nutrition data."
        canonical={canonical}
      />
      <JsonLd data={[itemListLd]} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Reveal as="h1" immediate variant="up" className="font-display text-4xl font-semibold text-forest sm:text-5xl">
          What does your body need?
        </Reveal>
        <Reveal as="p" immediate variant="up" delay={90} className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/75">
          Pick a nutrient to see why it matters, where to find it, and every recipe on the site rich in it — with real per-serving numbers.
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {nutrients.map((n, i) => {
            const count = (n.recipeSlugs || []).length
            return (
              <Reveal key={n.key} variant="up" delay={Math.min(i * 50, 300)}>
                <Link
                  to={`/nutrients/${n.slug || n.key}`}
                  className="group flex h-full items-start gap-4 rounded-3xl border border-forest-line bg-cream-card p-6 shadow-[0_8px_30px_rgba(30,70,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,70,51,0.14)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-cream transition group-hover:bg-ember-dark">
                    <NutrientIcon iconKey={n.slug || n.key} className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="font-display text-xl font-semibold text-forest group-hover:text-ember-dark">
                      {n.name}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-forest/75">
                      {count} recipe{count === 1 ? '' : 's'} · {n.dailyValue} daily value
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ember-dark">
                      Explore {n.name.toLowerCase()} recipes <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </div>

        <Reveal variant="fade" className="mt-12 text-center">
          <p className="text-forest/75">
            Not sure where to start? <Link to="/search" className="font-semibold text-ember-dark underline hover:text-forest">Search all recipes</Link> by nutrient and amount.
          </p>
        </Reveal>
      </div>
    </>
  )
}
