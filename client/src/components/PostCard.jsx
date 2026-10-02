import React from 'react'
import { Link } from 'react-router-dom'
import ResponsiveImage from './ResponsiveImage'

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

/** Article card: image, category, title, description, date + read time. */
export default function PostCard({ post, headingLevel = 'h3' }) {
  const H = headingLevel
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative overflow-hidden">
        <ResponsiveImage
          src={post.image}
          alt=""
          loading="lazy"
          width={800}
          height={500}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-zest px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
          {post.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-ink/55">
          {formatPostDate(post.datePublished)} · {readTimeMinutes(post)} min read
        </p>
        <H className="mt-2 font-display text-xl font-bold leading-snug text-ink">
          <Link to={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-leaf-dark">
            {post.title}
          </Link>
        </H>
        <p className="mt-2 line-clamp-3 flex-1 text-pretty text-[15px] leading-relaxed text-ink/65">{post.description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-dark">
          Read article <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  )
}
