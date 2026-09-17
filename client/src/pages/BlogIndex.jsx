import React from 'react'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'
import PostCard from '../components/PostCard'
import { absUrl, absImage, posts } from '../data/site'

export default function BlogIndex() {
  const canonical = absUrl('/blog')
  const title = 'Blog | The Recipe Seeker'
  const description =
    'Nutrition-first food writing: iron + vitamin C pairings, zinc for vegetarians, high-protein breakfasts and practical meal plans — with real per-serving numbers.'

  const sorted = [...posts].sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''))

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

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog' }]} />

        <Reveal as="p" immediate variant="up" className="mt-6 text-sm font-semibold uppercase tracking-widest text-ember-dark">
          The Blog
        </Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          Nutrition-first food writing
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={160} className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/75">
          Practical explainers and meal plans from Emily's kitchen — which foods pair
          well, what helps (or blocks) absorption, and how to hit your numbers with
          real meals. Every claim ties back to a tested recipe.
        </Reveal>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((post, i) => (
            <Reveal key={post.slug} variant="up" delay={Math.min(i * 80, 320)}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      </div>
    </>
  )
}
