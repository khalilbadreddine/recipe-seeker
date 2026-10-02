import React from 'react'
import { Link } from 'react-router-dom'
import { guides, nutrients, recipes } from '../data/site'
import { nutrientMeta } from '../data/nutrientMeta'
import { LogoMark, Wordmark } from './Navbar'

const COMPANY = [
  { label: 'About Emily', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Medical disclaimer', to: '/disclaimer' },
  { label: 'Privacy', to: '/privacy' },
]

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-paper/85">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        {/* Nutrient strip */}
        <div className="flex flex-col gap-6 border-b border-paper/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <p className="font-display text-3xl font-bold leading-tight text-paper sm:text-4xl">
              Cook for what your body <span className="text-zest">actually needs.</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              {recipes.length} recipes with real per-serving nutrition from USDA data. No fluff, no miracle claims.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
            {nutrients.map((n) => (
              <li key={n.key}>
                <Link
                  to={`/nutrients/${n.slug || n.key}`}
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-paper/15 px-3.5 text-sm text-paper/80 hover:border-paper/40 hover:text-paper"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: nutrientMeta(n.key).color }} />
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="The Recipe Seeker, home">
              <LogoMark className="h-9 w-9" />
              <Wordmark dark />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
              Nutrition-first recipes for real life by Emily Carter, recipe developer &amp; nutrition enthusiast.
            </p>
            <a
              href="/downloads/7-day-high-protein-meal-plan.pdf"
              download
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-zest px-5 text-sm font-bold text-ink hover:brightness-95"
            >
              Free 7-day protein plan (PDF)
            </a>
          </div>
          <nav aria-label="Explore">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-paper/50">Explore</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li><Link to="/recipes" className="hover:text-zest">All recipes</Link></li>
              <li><Link to="/nutrients" className="hover:text-zest">Browse by nutrient</Link></li>
              <li><Link to="/search" className="hover:text-zest">Nutrient search</Link></li>
              <li><Link to="/day-builder" className="hover:text-zest">My Day planner</Link></li>
              <li><Link to="/saved" className="hover:text-zest">Saved recipes</Link></li>
            </ul>
          </nav>
          <nav aria-label="Read">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-paper/50">Read</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li><Link to="/blog" className="hover:text-zest">Blog</Link></li>
              {guides.map((g) => (
                <li key={g.slug}><Link to={`/guides/${g.slug}`} className="hover:text-zest">{g.title}</Link></li>
              ))}
              <li><Link to="/fibermax-reset" className="hover:text-zest">Fibermax Reset · 14-day plan</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-paper/50">Company</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {COMPANY.map((c) => (
                <li key={c.to}><Link to={c.to} className="hover:text-zest">{c.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-paper/10 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 The Recipe Seeker. General information only, not medical advice.</p>
          <p>Nutrition data: USDA FoodData Central</p>
        </div>
      </div>
    </footer>
  )
}
