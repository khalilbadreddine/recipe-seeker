import React from 'react'
import { Link } from 'react-router-dom'
import ResponsiveImage from './ResponsiveImage'
import { AUTHOR } from '../data/author'

/**
 * Small author byline shown under content pages: photo, name, role,
 * one-line bio, and a link to the full /about story.
 * Honesty: role is "Recipe developer & nutrition enthusiast" - no medical credentials.
 */
export default function AuthorByline() {
  return (
    <aside
      aria-label={`About the author, ${AUTHOR.name}`}
      className="flex items-start gap-4 rounded-[1.5rem] border border-forest-line bg-cream-card p-5 shadow-[0_12px_32px_rgba(30,70,51,0.08)]"
    >
      <ResponsiveImage
        src={AUTHOR.photo}
        alt={`${AUTHOR.name}, ${AUTHOR.role}`}
        loading="lazy"
        width={96}
        height={96}
        sizes="80px"
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-forest-soft sm:h-20 sm:w-20"
      />
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-forest">{AUTHOR.name}</p>
        <p className="mt-0.5 text-sm font-medium text-ember-dark">{AUTHOR.role}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-forest/75">{AUTHOR.oneLineBio}</p>
        <Link
          to="/about"
          className="mt-2 inline-block text-sm font-semibold text-forest underline decoration-ember/60 decoration-2 underline-offset-4 transition-colors hover:text-ember"
        >
          Read Emily's story →
        </Link>
      </div>
    </aside>
  )
}
