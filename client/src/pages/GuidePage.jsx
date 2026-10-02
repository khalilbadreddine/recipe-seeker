import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import FaqAccordion from '../components/FaqAccordion'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import AuthorByline from '../components/AuthorByline'
import Reveal from '../components/Reveal'
import { ArticleSections, TableOfContents } from '../components/ContentBlocks'
import { formatPostDate } from '../components/PostCard'
import { absUrl, absImage, getGuide, getRecipe } from '../data/site'
import { useDetail } from '../lib/details'

export default function GuidePage() {
  const { slug } = useParams()
  const summary = getGuide(slug)
  const { data: detail, error: detailError } = useDetail('guides', slug)
  const guide = useMemo(() => (summary && detail ? { ...summary, ...detail } : summary), [summary, detail])
  const ready = Boolean(summary && detail)

  if (!guide) {
    return (
      <>
        <Seo title="Guide not found | The Recipe Seeker" description="This guide could not be found." canonical={absUrl('/guides/')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold text-ink">Guide not found</h1>
          <p className="mt-4 text-ink/70">That guide doesn’t exist (yet).</p>
          <Link to="/" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-semibold text-paper">Back home</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/guides/${guide.slug}`)
  const title = `${guide.title} | The Recipe Seeker`
  const description = guide.description.slice(0, 160)
  const related = ready ? guide.relatedRecipes.map(getRecipe).filter(Boolean) : []

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
      { '@type': 'ListItem', position: 2, name: 'Guides', item: absUrl('/guides') },
      { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
    ],
  }
  const faqLd = ready && {
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
      <JsonLd data={ready ? [articleLd, breadcrumbLd, faqLd] : [articleLd, breadcrumbLd]} />

      <article className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Guides', to: '/guides' }, { label: guide.title }]} />

        <header className="relative overflow-hidden rounded-[2rem] bg-zest px-6 py-12 sm:px-12 sm:py-16">
          <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative max-w-3xl">
            <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">Nutrition guide</Reveal>
            <Reveal as="h1" immediate variant="up" delay={60} className="mt-3 font-display text-4xl font-extrabold leading-[1.04] text-ink sm:text-6xl">
              {guide.title}
            </Reveal>
            <Reveal immediate variant="up" delay={120} className="mt-8">
              <AuthorByline compact date={`Published ${formatPostDate(guide.datePublished)} · Updated ${formatPostDate(guide.dateModified)}`} />
            </Reveal>
          </div>
        </header>

        {ready ? (
        <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 max-w-3xl">
            {/* Direct-answer lede: first ~100 words, citation-friendly */}
            <p className="rounded-3xl border-l-[6px] border-leaf bg-card px-6 py-5 text-lg leading-relaxed text-ink/85 sm:text-xl">
              {guide.lede}
            </p>

            <ArticleSections sections={guide.sections} idPrefix="guide" />

            {related.length > 0 && (
              <section className="mt-14" aria-labelledby="guide-related">
                <h2 id="guide-related" className="font-display text-3xl font-extrabold text-ink">Recipes mentioned in this guide</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {related.map((r, i) => (
                    <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                      <RecipeCard recipe={r} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-14" aria-labelledby="guide-faq">
              <h2 id="guide-faq" className="font-display text-3xl font-extrabold text-ink">Frequently asked questions</h2>
              <div className="mt-6">
                <FaqAccordion faqs={guide.faqs} idPrefix={`faq-${guide.slug}`} />
              </div>
            </section>

            <div className="mt-12 space-y-6">
              <AuthorByline />
              <MedicalDisclaimer />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={guide.sections} idPrefix="guide" />
            </div>
          </aside>
        </div>
        ) : detailError ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-line bg-card p-6">
            <p className="font-display text-xl font-bold text-ink">We couldn’t load this guide.</p>
            <a href={`/guides/${slug}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-bold text-paper">Reload</a>
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-3xl space-y-4" aria-busy="true">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-3xl bg-mist" />
            ))}
          </div>
        )}
      </article>
    </>
  )
}
