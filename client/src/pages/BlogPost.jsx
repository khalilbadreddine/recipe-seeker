import React from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import Breadcrumbs from '../components/Breadcrumbs'
import RecipeCard from '../components/RecipeCard'
import FaqAccordion from '../components/FaqAccordion'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import AuthorByline from '../components/AuthorByline'
import ResponsiveImage from '../components/ResponsiveImage'
import Reveal from '../components/Reveal'
import { ArticleSections, TableOfContents } from '../components/ContentBlocks'
import PostCard, { readTimeMinutes, formatPostDate } from '../components/PostCard'
import { absUrl, absImage, getPost, getRecipe, posts } from '../data/site'
import { AUTHOR_PERSON_LD } from '../data/author'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  if (!post) {
    return (
      <>
        <Seo title="Article not found | The Recipe Seeker" description="This article could not be found." canonical={absUrl('/blog')} noindex />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold text-ink">Article not found</h1>
          <p className="mt-4 text-ink/70">That article doesn’t exist (yet).</p>
          <Link to="/blog" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-semibold text-paper">Back to the blog</Link>
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

      <article className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: post.title }]} />

        <header className="mx-auto max-w-3xl text-center">
          <Reveal immediate variant="up">
            <span className="inline-block rounded-full bg-zest px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink">{post.category}</span>
          </Reveal>
          <Reveal as="h1" immediate variant="up" delay={60} className="mt-4 font-display text-4xl font-extrabold leading-[1.04] text-ink sm:text-6xl">
            {post.title}
          </Reveal>
          <Reveal immediate variant="up" delay={120} className="mt-6 flex justify-center">
            <AuthorByline compact date={`${formatPostDate(post.datePublished)} · ${readTimeMinutes(post)} min read`} />
          </Reveal>
        </header>

        <Reveal variant="scale" immediate delay={160} className="mt-10">
          <ResponsiveImage
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            fetchPriority="high"
            sizes="(max-width: 1280px) 100vw, 1232px"
            className="aspect-[16/9] w-full rounded-[2rem] object-cover sm:aspect-[21/9]"
          />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 max-w-3xl">
            {/* Direct-answer lede: citation-friendly opening */}
            <p className="rounded-3xl border-l-[6px] border-leaf bg-card px-6 py-5 text-lg leading-relaxed text-ink/85 sm:text-xl">
              {post.lede}
            </p>

            <ArticleSections sections={post.sections} idPrefix="post" />

            {relatedRecipes.length > 0 && (
              <section className="mt-14" aria-labelledby="post-related-recipes">
                <h2 id="post-related-recipes" className="font-display text-3xl font-extrabold text-ink">Recipes in this article</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {relatedRecipes.map((r, i) => (
                    <Reveal key={r.slug} variant="up" delay={Math.min(i * 80, 240)}>
                      <RecipeCard recipe={r} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-14" aria-labelledby="post-faq">
              <h2 id="post-faq" className="font-display text-3xl font-extrabold text-ink">Frequently asked questions</h2>
              <div className="mt-6">
                <FaqAccordion faqs={post.faqs} idPrefix={`faq-${post.slug}`} />
              </div>
            </section>

            <div className="mt-12 space-y-6">
              <AuthorByline />
              <MedicalDisclaimer />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={post.sections} idPrefix="post" />
            </div>
          </aside>
        </div>

        {relatedPosts.length > 0 && (
          <section className="mt-20" aria-labelledby="post-related-posts">
            <h2 id="post-related-posts" className="font-display text-3xl font-extrabold text-ink">Keep reading</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p, i) => (
                <Reveal key={p.slug} variant="up" delay={Math.min(i * 80, 240)}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}
