import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import NutrientIcon from '../components/NutrientIcon'
import Icon from '../components/Icon'
import { absUrl, nutrients } from '../data/site'
import { nutrientMeta, tint, recipesForNutrient } from '../data/nutrientMeta'

/** /nutrients: index of all nutrient hubs. Prerendered, indexable. */
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
        description="Find recipes by what your body needs: iron, protein, fiber, vitamin C, calcium, zinc and more, with per-serving nutrition data."
        canonical={canonical}
      />
      <JsonLd data={[itemListLd]} />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Nutrients' }]} />
        <div className="max-w-3xl">
          <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">
            Browse by nutrient
          </Reveal>
          <Reveal as="h1" immediate variant="up" delay={60} className="mt-2 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
            What does your body <span className="mark-zest">need?</span>
          </Reveal>
          <Reveal as="p" immediate variant="up" delay={120} className="mt-5 text-lg leading-relaxed text-ink/65">
            Pick a nutrient to see why it matters, how much you need, the best food sources, and every recipe on the site that’s rich in it.
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nutrients.map((n, i) => {
            const meta = nutrientMeta(n.key)
            const count = recipesForNutrient(n).length
            return (
              <Reveal as="li" key={n.key} variant="up" delay={Math.min(i * 40, 300)}>
                <Link
                  to={`/nutrients/${n.slug || n.key}`}
                  className="group flex h-full flex-col rounded-[2rem] p-6 hover:-translate-y-1"
                  style={{ backgroundColor: tint(meta.color, 0.12) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: meta.color }}>
                      <NutrientIcon iconKey={n.slug || n.key} className="h-7 w-7" />
                    </span>
                    <span className="rounded-full bg-card/80 px-3 py-1 text-xs font-bold text-ink">DV {n.dailyValue}</span>
                  </div>
                  <h2 className="mt-8 font-display text-3xl font-extrabold text-ink">{n.name}</h2>
                  <p className="mt-2 line-clamp-2 flex-1 text-[15px] leading-relaxed text-ink/65">{n.whatItDoes}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                    {count} recipes <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </ul>

        <div className="mt-12 rounded-3xl border border-line bg-card px-6 py-6 text-center">
          <p className="text-ink/70">
            Need a specific amount?{' '}
            <Link to="/search" className="font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-4">
              Search recipes by nutrient and minimum per serving
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  )
}
