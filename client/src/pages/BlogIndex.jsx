import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import PostCard, { readTimeMinutes, formatPostDate } from '../components/PostCard'
import ResponsiveImage from '../components/ResponsiveImage'
import Icon from '../components/Icon'
import { absUrl, absImage, posts, guides } from '../data/site'

export default function BlogIndex() {
  const canonical = absUrl('/blog')
  const title = 'Blog | The Recipe Seeker'
  const description =
    'Nutrition-first food writing: iron + vitamin C pairings, zinc for vegetarians, high-protein breakfasts and practical meal plans, with real per-serving numbers.'

  const sorted = [...posts].sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''))
  const [lead, ...rest] = sorted

  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'The Recipe Seeker Blog',
    description,
    url: canonical,
    publisher: { '@type': 'Organization', name: 'The Recipe Seeker', url: absUrl('/') },
    blogPost: sorted.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      url: absUrl(`/blog/${p.slug}`),
      image: [absImage(p.image)],
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      author: { '@type': 'Person', name: 'Emily Carter', url: absUrl('/about') },
    })),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: canonical },
    ],
  }

  return (
    <>
      <Seo title={title} description={description} canonical={canonical} image={absImage('/images/hero-bowl.webp')} />
      <JsonLd data={[blogLd, breadcrumbLd]} />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog' }]} />

        <div className="max-w-3xl">
          <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">The blog</Reveal>
          <Reveal as="h1" immediate variant="up" delay={60} className="mt-2 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl">
            Nutrition-first food writing
          </Reveal>
          <Reveal as="p" immediate variant="up" delay={120} className="mt-4 text-lg leading-relaxed text-ink/65">
            Practical explainers and meal plans from Emily’s kitchen: which foods pair well, what helps (or blocks) absorption, and how to hit your numbers with real meals.
          </Reveal>
        </div>

        {lead && (
          <Reveal variant="up" className="mt-12">
            <article className="group relative grid overflow-hidden rounded-[2rem] border border-line bg-card lg:grid-cols-[1.2fr_1fr]">
              <ResponsiveImage
                src={lead.image}
                alt=""
                width={1200}
                height={800}
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 700px"
                className="aspect-[16/10] h-full w-full object-cover lg:aspect-auto"
              />
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <span className="w-fit rounded-full bg-zest px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">Latest · {lead.category}</span>
                <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                  <Link to={`/blog/${lead.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-leaf-dark">
                    {lead.title}
                  </Link>
                </h2>
                <p className="mt-3 text-lg leading-relaxed text-ink/65">{lead.description}</p>
                <p className="mt-5 text-sm font-medium text-ink/50">
                  {formatPostDate(lead.datePublished)} · {readTimeMinutes(lead)} min read
                </p>
              </div>
            </article>
          </Reveal>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <Reveal key={post.slug} variant="up" delay={Math.min(i * 70, 280)}>
              <PostCard post={post} headingLevel="h2" />
            </Reveal>
          ))}
        </div>

        {guides.length > 0 && (
          <section className="mt-16" aria-labelledby="guides-heading">
            <h2 id="guides-heading" className="font-display text-3xl font-extrabold text-ink">In-depth guides</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link to={`/guides/${g.slug}`} className="group flex h-full items-center justify-between gap-6 rounded-3xl bg-ink p-6 text-paper hover:bg-leaf-dark sm:p-8">
                    <span>
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-zest">Guide</span>
                      <span className="mt-2 block font-display text-2xl font-bold leading-tight">{g.title}</span>
                    </span>
                    <Icon name="arrowRight" className="h-6 w-6 shrink-0 transition group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
