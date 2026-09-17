import React from 'react'
import { Link } from 'react-router-dom'

/** Estimate reading time from post content (200 wpm, minimum 1 min). */
export function readTimeMinutes(post) {
  let words = post.lede.split(/\s+/).length
  for (const s of post.sections || []) {
    words += s.h2.split(/\s+/).length
    for (const p of s.paragraphs || []) words += p.split(/\s+/).length
    for (const item of s.list || []) words += item.split(/\s+/).length
  }
  return Math.max(1, Math.round(words / 200))
}

export function formatPostDate(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Card for the blog index: image, category badge, title, description,
 * date + read time. Brand-matched to RecipeCard styling.
 */
export default function PostCard({ post }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-cream-card shadow-[0_8px_30px_rgba(30,70,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,70,51,0.14)]">
      <Link to={`/blog/${post.slug}`} className="block" aria-label={post.title}>
        <div className="relative overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            loading="lazy"
            width={800}
            height={533}
            className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-xs font-bold uppercase tracking-wider text-cream">
            {post.category}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-forest/75">
          {formatPostDate(post.datePublished)} · {readTimeMinutes(post)} min read
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-forest">
          <Link to={`/blog/${post.slug}`} className="transition-colors group-hover:text-ember-dark">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-pretty text-[15px] leading-relaxed text-forest/80">{post.description}</p>
        <Link
          to={`/blog/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-dark transition-colors hover:text-ember"
        >
          Read the article
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}
