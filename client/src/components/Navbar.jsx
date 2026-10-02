import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import SignInButton, { GoogleIcon } from './SignInButton'
import Icon from './Icon'

/** Logo mark: ink tile with a zest sprout and a tomato seed. */
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#16201B" />
      <path d="M20 31c-6 0-10-4.5-10-10.5C10 13 16 8.5 26.5 7 25 17 21.5 22 15 25" fill="none" stroke="#D7F25C" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 31c1.2-6 4-11.5 10-15.5" fill="none" stroke="#D7F25C" strokeWidth="3" strokeLinecap="round" />
      <circle cx="29.5" cy="28.5" r="3" fill="#E5482D" />
    </svg>
  )
}

export function Wordmark({ dark = false }) {
  return (
    <span className={`whitespace-nowrap font-display text-lg font-bold leading-none sm:text-xl ${dark ? 'text-paper' : 'text-ink'}`}>
      Recipe<span className={dark ? 'text-zest' : 'text-leaf'}>Seeker</span>
    </span>
  )
}

function userDisplay(user) {
  const meta = user.user_metadata || {}
  const name = meta.given_name || (meta.full_name || '').split(' ')[0] || (user.email || 'You').split('@')[0]
  return { name, avatar: meta.avatar_url, initial: (name || 'Y').charAt(0).toUpperCase() }
}

function Avatar({ user, size = 'h-8 w-8' }) {
  const { avatar, initial } = userDisplay(user)
  return avatar ? (
    <img src={avatar} alt="" className={`${size} rounded-full object-cover`} referrerPolicy="no-referrer" />
  ) : (
    <span aria-hidden="true" className={`${size} inline-flex items-center justify-center rounded-full bg-ink font-display text-sm text-zest`}>
      {initial}
    </span>
  )
}

/** Signed-in user menu (desktop). Renders nothing when auth isn't configured. */
function UserChip() {
  const { configured, user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (!configured || loading || !user) return null
  const { name } = userDisplay(user)

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-sm font-semibold text-ink hover:border-ink/30"
      >
        <Avatar user={user} />
        <span className="max-w-[96px] truncate">{name}</span>
        <Icon name="chevronDown" className={`h-4 w-4 text-ink/50 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="pop-in absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[var(--shadow-lift)]">
          {[
            { label: 'Saved recipes', icon: 'heart', to: '/saved' },
            { label: 'My Day planner', icon: 'calendar', to: '/day-builder' },
          ].map((item) => (
            <button
              key={item.to}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate(item.to)
              }}
              className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-medium text-ink hover:bg-mist"
            >
              <Icon name={item.icon} className="h-5 w-5 text-leaf" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await signOut()
            }}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-medium text-ink hover:bg-mist"
          >
            <Icon name="logout" className="h-5 w-5 text-ink/50" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/** Sign-in / account row at the top of the mobile menu. */
function MobileAuthSection({ menuOpen, onNavigate }) {
  const { configured, user, loading, signInWithGoogle, signOut } = useAuth()
  if (!configured || loading) return null
  const tabIndex = menuOpen ? 0 : -1

  if (!user) {
    return (
      <div className="rounded-2xl bg-mist p-4">
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={() => {
            onNavigate()
            signInWithGoogle()
          }}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-card px-6 text-sm font-semibold text-ink shadow-sm"
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Sign in with Google
        </button>
        <p className="mt-2 text-center text-xs text-ink/60">Sync saved recipes &amp; meal plans across devices.</p>
      </div>
    )
  }

  const { name } = userDisplay(user)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-mist p-4">
      <Avatar user={user} size="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-ink/60">{user.email}</p>
      </div>
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={() => {
          onNavigate()
          signOut()
        }}
        className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-sm font-semibold text-ink"
      >
        Sign out
      </button>
    </div>
  )
}

const PRIMARY = [
  { label: 'Recipes', to: '/recipes' },
  { label: 'Nutrients', to: '/nutrients' },
  { label: 'My Day', to: '/day-builder' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
]

const MOBILE_EXTRA = [
  { label: 'Iron deficiency guide', to: '/guides/what-to-eat-for-iron-deficiency' },
  { label: 'High protein on a budget', to: '/guides/high-protein-meals-on-a-budget' },
  { label: 'Fibermax Reset · 14-day plan', to: '/fibermax-reset' },
  { label: 'Contact', to: '/contact' },
]

/**
 * Site header: sticky, translucent, with a compact desktop nav and a
 * full-height mobile sheet. Every link is a real route (crawlable <a>).
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const { favorites } = useFavorites()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('a, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const savedCount = favorites.length

  return (
    <header
      className={`sticky top-0 z-40 transition ${
        scrolled || menuOpen ? 'border-b border-line bg-paper/90 backdrop-blur-md' : 'border-b border-transparent bg-paper'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <Link to="/" className="flex items-center gap-2.5" aria-label="The Recipe Seeker, home">
          <LogoMark className="h-9 w-9" />
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PRIMARY.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-[15px] font-medium ${
                  isActive ? 'bg-ink text-paper' : 'text-ink/80 hover:bg-mist hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/search"
            aria-label="Search recipes"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-3.5 text-sm font-medium text-ink/70 hover:border-ink/30 hover:text-ink sm:pr-5"
          >
            <Icon name="search" className="h-5 w-5" />
            <span className="hidden sm:inline">Search</span>
          </Link>
          <Link
            to="/saved"
            aria-label={`Saved recipes${savedCount ? ` (${savedCount})` : ''}`}
            className="relative hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink hover:border-tomato hover:text-tomato lg:inline-flex"
          >
            <Icon name="heart" className="h-5 w-5" />
            {savedCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato px-1 text-[11px] font-bold text-white">
                {savedCount}
              </span>
            )}
          </Link>
          <span className="hidden lg:contents">
            <UserChip />
            <SignInButton compact />
          </span>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <nav
        id="mobile-menu"
        ref={panelRef}
        aria-label="Mobile"
        className={`fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-paper px-4 pb-28 pt-4 lg:hidden ${
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        } transition-[opacity,visibility] duration-200`}
      >
        <MobileAuthSection menuOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <ul className="mt-4">
          {[{ label: 'Home', to: '/' }, ...PRIMARY, { label: 'Saved recipes', to: '/saved' }, { label: 'Search', to: '/search' }].map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                tabIndex={menuOpen ? 0 : -1}
                className="flex min-h-[56px] items-center justify-between border-b border-line font-display text-2xl font-bold text-ink"
              >
                {l.label}
                <Icon name="arrowRight" className="h-5 w-5 text-ink/40" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-ink/50">More</p>
        <ul className="mt-2">
          {MOBILE_EXTRA.map((l) => (
            <li key={l.to}>
              <Link to={l.to} tabIndex={menuOpen ? 0 : -1} className="flex min-h-[48px] items-center text-base font-medium text-ink/80 hover:text-leaf-dark">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
