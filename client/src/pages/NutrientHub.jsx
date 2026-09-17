import React from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import Reveal from '../components/Reveal'
import { absUrl, absImage, getNutrient, getRecipe } from '../data/site'

export default function NutrientHub() {
  const { slug } = useParams()
  const nutrient = getNutrient(slug)

  if (!nutrient) {
    return (
      <>
        <Seo title="Nutrient not found | The Recipe Seeker" description="This nutrient hub could not be found." canonical={absUrl('/nutrients/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-forest">Nutrient not found</h1>
          <p className="mt-4 text-forest/80">We couldn’t find that nutrient. Here are the ones we cover:</p>
          <Link to="/#nutrients" className="mt-6 inline-block rounded-full bg-ember-dark px-6 py-3 font-semibold text-white shadow-sm transition hover:shadow-md">Browse nutrients</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/nutrients/${nutrient.slug || nutrient.key}`)
  const title = `${nutrient.name} in Food: Benefits, Daily Needs & Recipes | The Recipe Seeker`
  const description = `${nutrient.name}: what it does, how much you need (${nutrient.dailyValue}/day), the best food sources and ${nutrient.name.toLowerCase()}-rich recipes with real nutrition data.`.slice(0, 160)
  const hubRecipes = nutrient.recipeSlugs.map(getRecipe).filter(Boolean)

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
      { '@type': 'ListItem', position: 2, name: 'Nutrients', item: absUrl('/#nutrients') },
      { '@type': 'ListItem', position: 3, name: nutrient.name, item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How much ${nutrient.name.toLowerCase()} do I need per day?`,
        acceptedAnswer: { '@type': 'Answer', text: `The daily value for ${nutrient.name.toLowerCase()} is ${nutrient.dailyValue}. Individual needs vary. Talk to your doctor about what's right for you.` },
      },
      {
        '@type': 'Question',
        name: `What are the best food sources of ${nutrient.name.toLowerCase()}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Top sources include ${nutrient.foodSources.map(([f]) => f).join(', ')}. See the full table on this page.`,
        },
      },
      {
        '@type': 'Question',
        name: `What happens if I don't get enough ${nutrient.name.toLowerCase()}?`,
        acceptedAnswer: { '@type': 'Answer', text: nutrient.deficiencyNote },
      },
    ],
  }

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[itemListLd, breadcrumbLd, faqLd]} />

      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Nutrients', to: '/#nutrients' }, { label: nutrient.name }]} />

        <Reveal as="p" immediate variant="up" className="text-sm font-semibold uppercase tracking-widest text-ember-dark">Nutrient hub</Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 font-display text-4xl font-semibold text-forest sm:text-5xl">{nutrient.name}</Reveal>
        <Reveal immediate variant="fade" delay={160} className="mt-3">
          <p className="inline-flex items-center rounded-full bg-forest px-4 py-1.5 text-sm font-semibold text-cream">
            Daily value: {nutrient.dailyValue}
          </p>
        </Reveal>

        <Reveal variant="up" as="section" className="mt-8 max-w-3xl" aria-labelledby="what-heading">
          <h2 id="what-heading" className="font-display text-2xl font-semibold text-forest">What does {nutrient.name.toLowerCase()} do?</h2>
          <p className="mt-3 text-lg leading-relaxed text-forest/80">{nutrient.whatItDoes}</p>
        </Reveal>

        <Reveal variant="up" as="section" className="mt-10 max-w-3xl" aria-labelledby="deficiency-heading">
          <h2 id="deficiency-heading" className="font-display text-2xl font-semibold text-forest">
            What if you don’t get enough?
          </h2>
          <p className="mt-3 leading-relaxed text-forest/80">{nutrient.deficiencyNote}</p>
          <p className="mt-3 text-sm text-forest/75">
            Nutrient shortfalls can only be confirmed with proper testing. This page is general
            information, not a diagnosis. If you’re concerned, talk to your doctor.
          </p>
        </Reveal>

        <Reveal variant="up" as="section" className="mt-10" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="font-display text-2xl font-semibold text-forest">
            Top food sources of {nutrient.name.toLowerCase()}
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-forest-line bg-cream-card">
            {/* Mobile: stacked rows, no horizontal scrolling */}
            <ul className="divide-y divide-forest/10 sm:hidden">
              {nutrient.foodSources.map(([food, serving, amount], i) => (
                <li key={i} className="px-5 py-4">
                  <p className="font-medium text-forest">{food}</p>
                  <p className="mt-1 text-sm text-forest/80">
                    {serving} ·{' '}
                    <span className="font-semibold text-ember-dark">
                      {amount} {nutrient.name.toLowerCase()}
                    </span>{' '}
                    per serving
                  </p>
                </li>
              ))}
            </ul>
            {/* sm and up: full data table */}
            <div className="hidden sm:block">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-forest-line bg-forest-soft/60 text-forest">
                  <th scope="col" className="px-5 py-3 font-semibold">Food</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Serving</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">{nutrient.name} per serving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {nutrient.foodSources.map(([food, serving, amount], i) => (
                  <tr key={i} className="text-forest/85">
                    <td className="px-5 py-3 font-medium text-forest">{food}</td>
                    <td className="px-5 py-3">{serving}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ember-dark">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </Reveal>

        {hubRecipes.length > 0 && (
          <section className="mt-12" aria-labelledby="recipes-heading">
            <Reveal variant="up">
              <h2 id="recipes-heading" className="font-display text-3xl font-semibold text-forest">
                {nutrient.name}-rich recipes
              </h2>
              <p className="mt-2 text-forest/80">
                Every recipe below lists full per-serving nutrition, so you know exactly how much {nutrient.name.toLowerCase()} you’re getting.
              </p>
            </Reveal>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {hubRecipes.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min(i * 60, 300)}>
                  <RecipeCard recipe={r} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <Reveal variant="up" as="section" className="mt-12 max-w-3xl" aria-labelledby="hub-faq-heading">
          <h2 id="hub-faq-heading" className="font-display text-2xl font-semibold text-forest">
            {nutrient.name}: quick answers
          </h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-forest-line bg-cream-card p-5">
              <h3 className="font-semibold text-forest">How much {nutrient.name.toLowerCase()} do I need per day?</h3>
              <p className="mt-2 text-[15px] text-forest/75">The daily value is {nutrient.dailyValue}. Individual needs vary. Talk to your doctor about what’s right for you.</p>
            </div>
            <div className="rounded-2xl border border-forest-line bg-cream-card p-5">
              <h3 className="font-semibold text-forest">What are the best food sources?</h3>
              <p className="mt-2 text-[15px] text-forest/75">
                Top picks: {nutrient.foodSources.map(([f, s, a]) => `${f} (${a} per ${s})`).join('; ')}.
              </p>
            </div>
            <div className="rounded-2xl border border-forest-line bg-cream-card p-5">
              <h3 className="font-semibold text-forest">Can I get enough from food alone?</h3>
              <p className="mt-2 text-[15px] text-forest/75">
                For most people, a varied diet covers {nutrient.name.toLowerCase()} needs. {nutrient.deficiencyNote}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
