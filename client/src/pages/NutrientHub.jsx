import React from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import NutrientIcon from '../components/NutrientIcon'
import Icon from '../components/Icon'
import Reveal from '../components/Reveal'
import { SectionHeading } from '../components/ContentBlocks'
import FoodScene from '../components/FoodScene'
import { absUrl, absImage, getNutrient, nutrients } from '../data/site'
import { nutrientMeta, tint, recipesForNutrient } from '../data/nutrientMeta'

export default function NutrientHub() {
  const { slug } = useParams()
  const nutrient = getNutrient(slug)

  if (!nutrient) {
    return (
      <>
        <Seo title="Nutrient not found | The Recipe Seeker" description="This nutrient hub could not be found." canonical={absUrl('/nutrients/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold text-ink">Nutrient not found</h1>
          <p className="mt-4 text-ink/70">We couldn’t find that nutrient. Here are the ones we cover:</p>
          <Link to="/nutrients" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-semibold text-paper">Browse nutrients</Link>
        </div>
      </>
    )
  }

  const meta = nutrientMeta(nutrient.key)
  const lower = nutrient.name.toLowerCase()
  const canonical = absUrl(`/nutrients/${nutrient.slug || nutrient.key}`)
  const title = `${nutrient.name} in Food: Benefits, Daily Needs & Recipes | The Recipe Seeker`
  const description = `${nutrient.name}: what it does, how much you need (${nutrient.dailyValue}/day), the best food sources and ${lower}-rich recipes with real nutrition data.`.slice(0, 160)
  const hubRecipes = recipesForNutrient(nutrient)
  const dv = parseFloat(nutrient.dailyValue)
  const others = nutrients.filter((n) => n.key !== nutrient.key)

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Recipes rich in ${nutrient.name}`,
    itemListElement: hubRecipes.map((r, i) => ({
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
      { '@type': 'ListItem', position: 2, name: 'Nutrients', item: absUrl('/nutrients') },
      { '@type': 'ListItem', position: 3, name: nutrient.name, item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How much ${lower} do I need per day?`,
        acceptedAnswer: { '@type': 'Answer', text: `The daily value for ${lower} is ${nutrient.dailyValue}. Individual needs vary. Talk to your doctor about what's right for you.` },
      },
      {
        '@type': 'Question',
        name: `What are the best food sources of ${lower}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Top sources include ${nutrient.foodSources.map(([f]) => f).join(', ')}. See the full table on this page.`,
        },
      },
      {
        '@type': 'Question',
        name: `What happens if I don't get enough ${lower}?`,
        acceptedAnswer: { '@type': 'Answer', text: nutrient.deficiencyNote },
      },
    ],
  }

  const answers = [
    { q: `How much ${lower} do I need per day?`, a: `The daily value is ${nutrient.dailyValue}. Individual needs vary. Talk to your doctor about what’s right for you.` },
    { q: 'What are the best food sources?', a: `Top picks: ${nutrient.foodSources.map(([f, s, a]) => `${f} (${a} per ${s})`).join('; ')}.` },
    { q: 'Can I get enough from food alone?', a: `For most people, a varied diet covers ${lower} needs. ${nutrient.deficiencyNote}` },
  ]

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[itemListLd, breadcrumbLd, faqLd]} />

      <article className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Nutrients', to: '/nutrients' }, { label: nutrient.name }]} />

        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14" style={{ backgroundColor: tint(meta.color, 0.13) }}>
          <FoodScene key={nutrient.key} variant="panel" nutrient={nutrient.key} minWidth={1024} className="absolute bottom-[34%] left-[56%] right-0 top-0 hidden lg:block" />
          <div className="relative grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <div>
              <Reveal immediate variant="up" className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: meta.color }}>
                  <NutrientIcon iconKey={nutrient.slug || nutrient.key} className="h-6 w-6" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">Nutrient hub</span>
              </Reveal>
              <Reveal as="h1" immediate variant="up" delay={60} className="mt-5 font-display text-5xl font-extrabold leading-[1] text-ink sm:text-7xl">
                {nutrient.name}
              </Reveal>
              <Reveal as="p" immediate variant="up" delay={120} className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/75">
                {nutrient.whatItDoes}
              </Reveal>
            </div>
            <Reveal immediate variant="up" delay={180} className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">Daily value</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-ink">{nutrient.dailyValue}</p>
              </div>
              <a href="#recipes-heading" className="rounded-3xl bg-ink p-5 text-paper hover:bg-leaf-dark">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/60">Recipes</p>
                <p className="mt-1 flex items-center justify-between font-display text-3xl font-extrabold">
                  {hubRecipes.length} <Icon name="arrowDown" className="h-6 w-6 text-zest" />
                </p>
              </a>
            </Reveal>
          </div>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal variant="up" as="section" aria-labelledby="deficiency-heading">
            <h2 id="deficiency-heading" className="font-display text-3xl font-extrabold text-ink">What if you don’t get enough?</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink/75">{nutrient.deficiencyNote}</p>
            <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-sm leading-relaxed text-ink/65">
              Nutrient shortfalls can only be confirmed with proper testing. This page is general information, not a diagnosis. If you’re concerned, talk to your doctor.
            </p>
          </Reveal>

          <Reveal variant="up" as="section" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="font-display text-3xl font-extrabold text-ink">Top food sources of {lower}</h2>
            <ul className="mt-5 divide-y divide-line rounded-3xl border border-line bg-card px-5">
              {nutrient.foodSources.map(([food, serving, amount], i) => {
                const pct = dv ? Math.round((parseFloat(amount) / dv) * 100) : 0
                return (
                  <li key={i} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-semibold text-ink">{food}</span>
                      <span className="shrink-0 font-display text-lg font-bold" style={{ color: meta.color }}>{amount}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-sm text-ink/55">{serving}</span>
                      {pct > 0 && (
                        <span className="ml-auto flex w-36 items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: meta.color }} />
                          </span>
                          <span className="w-12 text-right text-xs font-semibold tabular-nums text-ink/60">{pct}%</span>
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-xs text-ink/50">% = share of the daily value per serving.</p>
          </Reveal>
        </div>

        {hubRecipes.length > 0 && (
          <section className="mt-20 scroll-mt-28" aria-labelledby="recipes-heading">
            <SectionHeading
              id="recipes-heading"
              eyebrow={`${hubRecipes.length} recipes`}
              title={`${nutrient.name}-rich recipes`}
              intro={`Every recipe lists full per-serving nutrition, so you know exactly how much ${lower} you’re getting.`}
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hubRecipes.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min((i % 6) * 60, 300)}>
                  <RecipeCard recipe={r} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <section className="mt-20" aria-labelledby="hub-faq-heading">
          <h2 id="hub-faq-heading" className="font-display text-3xl font-extrabold text-ink">{nutrient.name}: quick answers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {answers.map((item) => (
              <div key={item.q} className="rounded-3xl border border-line bg-card p-6">
                <h3 className="font-display text-lg font-bold text-ink">{item.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="other-nutrients">
          <h2 id="other-nutrients" className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Explore other nutrients</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((n) => (
              <li key={n.key}>
                <Link
                  to={`/nutrients/${n.slug || n.key}`}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink hover:border-ink/30"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nutrientMeta(n.key).color }} aria-hidden="true" />
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
