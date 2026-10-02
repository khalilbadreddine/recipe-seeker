import React from 'react'
import { NavLink } from 'react-router-dom'
import Icon from './Icon'
import { useFavorites } from '../context/FavoritesContext'

const TABS = [
  { label: 'Home', to: '/', icon: 'home', end: true },
  { label: 'Recipes', to: '/recipes', icon: 'bowl' },
  { label: 'Search', to: '/search', icon: 'search' },
  { label: 'My Day', to: '/day-builder', icon: 'calendar' },
  { label: 'Saved', to: '/saved', icon: 'heart' },
]

/** App-style bottom navigation on phones and tablets (hidden on desktop). */
export default function MobileTabBar() {
  const { favorites } = useFavorites()
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative flex h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  isActive ? 'text-ink' : 'text-ink/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`inline-flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-zest' : ''}`}>
                    <Icon name={t.icon} className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} />
                  </span>
                  {t.label}
                  {t.to === '/saved' && favorites.length > 0 && (
                    <span className="absolute right-[22%] top-2 h-2 w-2 rounded-full bg-tomato" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
