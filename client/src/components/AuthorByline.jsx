import React from 'react'
import { Link } from 'react-router-dom'
import ResponsiveImage from './ResponsiveImage'
import { AUTHOR } from '../data/author'

/**
 * Author byline: photo, name, role, one-line bio, link to /about.
 * Honesty: role is "Recipe developer & nutrition enthusiast", no medical credentials.
 * `compact` renders a single inline row for article headers.
 */
export default function AuthorByline({ compact = false, date }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <ResponsiveImage
          src={AUTHOR.photo}
          alt=""
          loading="lazy"
          width={96}
          height={96}
          sizes="48px"
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
        <div className="text-sm leading-tight">
          <p>
            By{' '}
            <Link to="/about" className="font-semibold text-ink hover:underline">
              {AUTHOR.name}
            </Link>
          </p>
          <p className="mt-0.5 text-ink/55">{date || AUTHOR.role}</p>
        </div>
      </div>
    )
  }
  return (
    <aside
      aria-label={`About the author, ${AUTHOR.name}`}
      className="flex items-start gap-4 rounded-3xl border border-line bg-card p-5"
    >
      <ResponsiveImage
        src={AUTHOR.photo}
        alt={`${AUTHOR.name}, ${AUTHOR.role}`}
        loading="lazy"
        width={96}
        height={96}
        sizes="80px"
        className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
      />
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-ink">{AUTHOR.name}</p>
        <p className="text-sm font-medium text-leaf-dark">{AUTHOR.role}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{AUTHOR.oneLineBio}</p>
        <Link to="/about" className="mt-2 inline-block text-sm font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-4 hover:decoration-leaf">
          Read Emily's story
        </Link>
      </div>
    </aside>
  )
}
