import React from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import FaqAccordion from '../components/FaqAccordion'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import AuthorByline from '../components/AuthorByline'
import Reveal from '../components/Reveal'
import { absUrl, absImage, getGuide, getRecipe } from '../data/site'

function SectionTable({ table }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-forest-line bg-cream-card">
      {/* Mobile: stacked rows, no horizontal scrolling */}
      <ul className="divide-y divide-forest/10 sm:hidden">
        {table.rows.map((row, i) => (
          <li key={i} className="px-5 py-4">
            <p className="font-medium text-forest">{row[0]}</p>
            <dl className="mt-1.5 space-y-1 text-sm">
              {row.slice(1).map((cell, j) => (
                <div key={j} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-forest/75">{table.headers[j + 1]}</dt>
                  <dd className="text-right font-medium text-forest/90">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      {/* sm and up: full data table */}
      <div className="hidden sm:block">
      <table className="w-full text-left text-[15px]">
        <thead>
          <tr className="border-b border-forest-line bg-forest-soft/60">
            {table.headers.map((h) => (
              <th key={h} scope="col" className="px-5 py-3 font-semibold text-forest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest/10">
          {table.rows.map((row, i) => (
            <tr key={i} className="text-forest/85">
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-medium text-forest' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

export default function GuidePage() {
  const { slug } = useParams()
  const guide = getGuide(slug)

  if (!guide) {
    return (
      <>
        <Seo title="Guide not found | The Recipe Seeker" description="This guide could not be found." canonical={absUrl('/guides/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-forest">Guide not found</h1>
          <p className="mt-4 text-forest/80">That guide doesn’t exist (yet).</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-ember-dark px-6 py-3 font-semibold text-white shadow-sm transition hover:shadow-md">Back home</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/guides/${guide.slug}`)
  const title = `${guide.title} | The Recipe Seeker`
  const description = guide.description.slice(0, 160)
  const related = guide.relatedRecipes.map(getRecipe).filter(Boolean)

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: [absImage('/images/hero-bowl.webp')],
    author: { '@type': 'Organization', name: 'The Recipe Seeker', url: absUrl('/') },
    publisher: { '@type': 'Organization', name: 'The Recipe Seeker', url: absUrl('/') },
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    mainEntityOfPage: canonical,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: canonical },
      { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        image={absImage('/images/hero-bowl.webp')}
        type="article"
        publishedTime={guide.datePublished}
        modifiedTime={guide.dateModified}
      />
      <JsonLd data={[articleLd, breadcrumbLd, faqLd]} />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Guides', to: '/' }, { label: guide.title }]} />

        <Reveal as="p" immediate variant="up" className="text-sm font-semibold uppercase tracking-widest text-ember-dark">Nutrition guide</Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          {guide.title}
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={160} className="mt-3 text-sm text-forest/75">
          Published {guide.datePublished}, updated {guide.dateModified}
        </Reveal>

        <Reveal variant="fade" delay={220} className="mt-6">
          <AuthorByline />
        </Reveal>

        {/* Direct-answer lede: first ~100 words, citation-friendly */}
        <Reveal variant="up" delay={280} as="p" className="mt-6 border-l-4 border-ember bg-cream-card px-5 py-4 text-lg leading-relaxed text-forest/90">
          {guide.lede}
        </Reveal>

        {guide.sections.map((section, i) => (
          <Reveal variant="up" as="section" key={i} className="mt-10" aria-labelledby={`guide-h2-${i}`}>
            <h2 id={`guide-h2-${i}`} className="font-display text-2xl font-semibold text-forest sm:text-3xl">
              {section.h2}
            </h2>
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mt-4 leading-relaxed text-forest/80">{p}</p>
            ))}
            {section.list && section.list.length > 0 && (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-forest/80 marker:text-ember">
                {section.list.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
            {section.table && <SectionTable table={section.table} />}
          </Reveal>
        ))}

        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="guide-related">
            <Reveal variant="up" as="h2" id="guide-related" className="font-display text-2xl font-semibold text-forest">Recipes mentioned in this guide</Reveal>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {related.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <RecipeCard recipe={r} badgeVariant="outline" />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <Reveal variant="up" as="section" className="mt-12" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="font-display text-2xl font-semibold text-forest">Frequently asked questions</h2>
          <div className="mt-5">
            <FaqAccordion faqs={guide.faqs} idPrefix={`faq-${guide.slug}`} />
          </div>
        </Reveal>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
