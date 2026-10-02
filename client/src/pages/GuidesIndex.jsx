import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import Icon from '../components/Icon'
import PostCard from '../components/PostCard'
import { absUrl, absImage, guides, posts } from '../data/site'

/** /guides: hub for the in-depth nutrition guides (plus the latest articles). */
export default function GuidesIndex() {
  const canonical = absUrl('/guides')
  const description = 'In-depth, practical nutrition guides: what to eat for iron, high-protein meals on a budget and more, each tied to real recipes with per-serving numbers.'
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Nutrition guides',
    itemListElement: guides.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/guides/${g.slug}`), name: g.title })),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: canonical },
    ],
  }
  const latest = [...posts].sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || '')).slice(0, 3)

  return (
    <>
      <Seo title="Nutrition Guides | The Recipe Seeker" description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[itemListLd, breadcrumbLd]} />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Guides' }]} />
        <div className="max-w-3xl">
          <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">Guides</Reveal>
          <Reveal as="h1" immediate variant="up" delay={60} className="mt-2 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
            Nutrition guides
          </Reveal>
          <Reveal as="p" immediate variant="up" delay={120} className="mt-4 text-lg leading-relaxed text-ink/65">{description}</Reveal>
        </div>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {guides.map((g, i) => (
            <Reveal as="li" key={g.slug} variant="up" delay={i * 60}>
              <Link to={`/guides/${g.slug}`} className="group flex h-full flex-col justify-between gap-8 rounded-[2rem] bg-ink p-7 text-paper hover:bg-leaf-dark sm:p-9">
                <span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-zest">Guide · {g.sectionCount} sections</span>
                  <span className="mt-3 block font-display text-3xl font-extrabold leading-tight">{g.title}</span>
                  <span className="mt-3 block leading-relaxed text-paper/70">{g.description}</span>
                </span>
                <span className="inline-flex items-center gap-2 font-semibold text-zest">
                  Read the guide <Icon name="arrowRight" className="h-5 w-5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>

        {latest.length > 0 && (
          <section className="mt-16" aria-labelledby="latest-heading">
            <div className="flex items-end justify-between gap-4">
              <h2 id="latest-heading" className="font-display text-3xl font-extrabold text-ink">Latest articles</h2>
              <Link to="/blog" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-leaf-dark">
                All articles <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
