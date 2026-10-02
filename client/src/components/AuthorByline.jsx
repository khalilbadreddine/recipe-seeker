import React from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from './Navbar'
import { AUTHOR } from '../data/author'

/**
 * Byline: who made this and how. `compact` renders a single row for headers.
 * Honesty: the brand speaks, no invented person, no medical credentials.
 */
export default function AuthorByline({ compact = false, date }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <LogoMark className="h-11 w-11 shrink-0" />
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
    <aside aria-label={`About ${AUTHOR.name}`} className="flex items-start gap-4 rounded-3xl border border-line bg-card p-5">
      <LogoMark className="h-14 w-14 shrink-0" />
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-ink">{AUTHOR.name}</p>
        <p className="text-sm font-medium text-leaf-dark">{AUTHOR.role}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{AUTHOR.oneLineBio}</p>
        <Link to="/about" className="mt-2 inline-block text-sm font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-4 hover:decoration-leaf">
          How we make our recipes
        </Link>
      </div>
    </aside>
  )
}
