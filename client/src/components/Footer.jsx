import React from 'react'
import { Link } from 'react-router-dom'
import { guides } from '../data/site'
import { LogoMark } from './Navbar'

const NUTRITION_GOALS = [
  { label: 'Iron', to: '/nutrients/iron' },
  { label: 'Protein', to: '/nutrients/protein' },
  { label: 'Fiber', to: '/nutrients/fiber' },
  { label: 'Vitamin C', to: '/nutrients/vitamin-c' },
  { label: 'Zinc', to: '/nutrients/zinc' },
]

const COMPANY = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Disclaimer', to: '/disclaimer' },
  { label: 'Privacy', to: '/privacy' },
]

export default function Footer() {
  return (
    <footer className="bg-forest-deep text-cream/90">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr_1.4fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-lg font-semibold text-cream">The Recipe Seeker</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/70">
            Nutrition-first recipes for real life. Balanced, wholesome, delicious.
          </p>
        </div>
        <nav aria-label="Explore">
          <h3 className="font-display text-base font-semibold text-cream">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/recipes" className="hover:text-ember">All Recipes</Link></li>
            <li><Link to="/nutrients" className="hover:text-ember">By Nutrient</Link></li>
            {guides.map((g) => (
              <li key={g.slug}><Link to={`/guides/${g.slug}`} className="hover:text-ember">{g.title}</Link></li>
            ))}
            <li><Link to="/fibermax-reset" className="hover:text-ember">Fibermax Reset <span className="text-cream/60">· 14-day meal plan</span></Link></li>
            <li><Link to="/blog" className="hover:text-ember">Blog</Link></li>
            <li><Link to="/day-builder" className="hover:text-ember">My Day — meal builder</Link></li>
            <li><Link to="/saved" className="hover:text-ember">Saved recipes</Link></li>
          </ul>
        </nav>
        <nav aria-label="Nutrition goals">
          <h3 className="font-display text-base font-semibold text-cream">Nutrition goals</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {NUTRITION_GOALS.map((g) => (
              <li key={g.to}><Link to={g.to} className="hover:text-ember">{g.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h3 className="font-display text-base font-semibold text-cream">Company</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {COMPANY.map((c) => (
              <li key={c.to}><Link to={c.to} className="hover:text-ember">{c.label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h3 className="font-display text-base font-semibold text-cream">Free meal plan</h3>
          <p className="mt-3 text-sm text-cream/70">Get our 7-day high-protein meal plan, free.</p>
          <a
            href="/downloads/7-day-high-protein-meal-plan.pdf"
            download
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-ember-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Download the PDF
          </a>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-cream/60 sm:flex-row sm:px-6">
          <p>© 2026 The Recipe Seeker. All rights reserved. Made with nutrition in mind.</p>
          <div className="flex gap-4">
            <Link to="/search" className="hover:text-ember">Search</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
