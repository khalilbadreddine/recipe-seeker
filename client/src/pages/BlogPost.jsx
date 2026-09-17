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
import PostCard, { readTimeMinutes, formatPostDate } from '../components/PostCard'
import { absUrl, absImage, getPost, getRecipe, posts } from '../data/site'
import { AUTHOR_PERSON_LD } from '../data/author'

/**
 * Renders paragraph/list text with inline links:
 *   [Label](recipe:some-slug) → /recipes/some-slug
 *   [Label](post:some-slug)   → /blog/some-slug
 */
function RichText({ text }) {
  const parts = text.split(/(\[[^\]]+\]\((?:recipe|post):[a-z0-9-]+\))/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\((recipe|post):([a-z0-9-]+)\)$/)
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>
        const [, label, kind, slug] = m
        const to = kind === 'recipe' ? `/recipes/${slug}` : `/blog/${slug}`
        return (
          <Link
            key={i}
            to={to}
            className="font-medium text-ember-dark underline decoration-ember/40 underline-offset-2 transition-colors hover:text-ember"
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

/** Mobile-stacked data table (same pattern as the guide pages). */
function SectionTable({ table }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-forest-line bg-cream-card">
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

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  if (!post) {
    return (
      <>
        <Seo title="Article not found | The Recipe Seeker" description="This article could not be found." canonical={absUrl('/blog')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-forest">Article not found</h1>
          <p className="mt-4 text-forest/80">That article doesn’t exist (yet).</p>
          <Link to="/blog" className="mt-6 inline-block rounded-full bg-ember-dark px-6 py-3 font-semibold text-white shadow-sm transition hover:shadow-md">Back to the blog</Link>
        </div>
      </>
    )
  }

  const canonical = absUrl(`/blog/${post.slug}`)
  const title = `${post.title} | The Recipe Seeker`
  const description = post.description.slice(0, 160)
  const relatedRecipes = (post.relatedRecipes || []).map(getRecipe).filter(Boolean)
  const relatedPosts = [
    ...posts.filter((p) => p.slug !== post.slug && p.category === post.category),
    ...posts.filter((p) => p.slug !== post.slug && p.category !== post.category),
  ].slice(0, 3)

  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: [absImage(post.image)],
    author: AUTHOR_PERSON_LD,
    publisher: { '@type': 'Organization', name: 'The Recipe Seeker', url: absUrl('/') },
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: canonical,
    articleSection: post.category,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: absUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((f) => ({
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
        image={absImage(post.image)}
        type="article"
        publishedTime={post.datePublished}
        modifiedTime={post.dateModified}
      />
      <JsonLd data={[blogPostingLd, breadcrumbLd, faqLd]} />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: post.title }]} />

        <Reveal as="p" immediate variant="up" className="mt-6 text-sm font-semibold uppercase tracking-widest text-ember-dark">
          {post.category}
        </Reveal>
        <Reveal as="h1" immediate variant="up" delay={80} className="mt-2 font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
          {post.title}
        </Reveal>
        <Reveal as="p" immediate variant="fade" delay={160} className="mt-3 text-sm text-forest/75">
          {formatPostDate(post.datePublished)} · {readTimeMinutes(post)} min read
        </Reveal>

        <Reveal variant="fade" delay={200} className="mt-6">
          <img
            src={post.image}
            alt={post.title}
            width={1200}
            height={800}
            className="aspect-[3/2] w-full rounded-[2rem] object-cover shadow-[0_24px_60px_rgba(30,70,51,0.15)]"
          />
        </Reveal>

        <Reveal variant="fade" delay={220} className="mt-6">
          <AuthorByline />
        </Reveal>

        {/* Direct-answer lede: citation-friendly opening */}
        <Reveal variant="up" delay={260} as="p" className="mt-6 border-l-4 border-ember bg-cream-card px-5 py-4 text-lg leading-relaxed text-forest/90">
          {post.lede}
        </Reveal>

        {post.sections.map((section, i) => (
          <Reveal variant="up" as="section" key={i} className="mt-10" aria-labelledby={`post-h2-${i}`}>
            <h2 id={`post-h2-${i}`} className="font-display text-2xl font-semibold text-forest sm:text-3xl">
              {section.h2}
            </h2>
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mt-4 leading-relaxed text-forest/80"><RichText text={p} /></p>
            ))}
            {section.list && section.list.length > 0 && (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-forest/80 marker:text-ember">
                {section.list.map((item, j) => (
                  <li key={j}><RichText text={item} /></li>
                ))}
              </ul>
            )}
            {section.table && <SectionTable table={section.table} />}
          </Reveal>
        ))}

        {relatedRecipes.length > 0 && (
          <section className="mt-12" aria-labelledby="post-related-recipes">
            <Reveal variant="up" as="h2" id="post-related-recipes" className="font-display text-2xl font-semibold text-forest">
              Recipes in this article
            </Reveal>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {relatedRecipes.map((r, i) => (
                <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <RecipeCard recipe={r} badgeVariant="outline" />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <Reveal variant="up" as="section" className="mt-12" aria-labelledby="post-faq">
          <h2 id="post-faq" className="font-display text-2xl font-semibold text-forest">Frequently asked questions</h2>
          <div className="mt-5">
            <FaqAccordion faqs={post.faqs} idPrefix={`faq-${post.slug}`} />
          </div>
        </Reveal>

        {relatedPosts.length > 0 && (
          <section className="mt-12" aria-labelledby="post-related-posts">
            <Reveal variant="up" as="h2" id="post-related-posts" className="font-display text-2xl font-semibold text-forest">
              Keep reading
            </Reveal>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p, i) => (
                <Reveal key={p.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
