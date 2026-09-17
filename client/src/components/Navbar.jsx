import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SignInButton, { GoogleIcon } from './SignInButton'

/** Logo mark: tomato-orange circle with a leaf-ish sprout. */
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-forest" />
      <svg viewBox="0 0 24 24" className="relative m-auto h-3/5 w-3/5 text-cream" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 21c-4 0-7-3-7-7 0-5 4-9 10-11-1 6-3 10-7 12" />
        <path d="M12 21c1-4 2-8 6-11" />
      </svg>
    </span>
  )
}

/**
 * UserChip — signed-in user menu: avatar/initial + given name, dropdown with
 * "Saved recipes" and "Sign out". Renders nothing when auth isn't configured.
 */
function UserChip() {
  const { configured, user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open ])

  if (!configured || loading || !user) return null

  const meta = user.user_metadata || {}
  const name = meta.given_name || (meta.full_name || '').split(' ')[0] || (user.email || 'You').split('@')[0]
  const avatar = meta.avatar_url
  const initial = (name || 'Y').charAt(0).toUpperCase()

  const goSaved = () => {
    setOpen(false)
    navigate('/saved')
  }
  const doSignOut = async () => {
    setOpen(false)
    await signOut()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-forest/20 bg-cream-card py-1 pl-1 pr-3 font-semibold text-forest shadow-sm transition hover:border-forest/50"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest font-display text-sm text-cream">
            {initial}
          </span>
        )}
        <span className="max-w-[96px] truncate text-sm">{name}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 text-forest/60 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-forest/15 bg-cream-card shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={goSaved}
            className="flex min-h-[48px] w-full items-center gap-2.5 px-4 text-left text-[15px] font-medium text-forest transition hover:bg-forest/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-ember" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.3a5 5 0 1 1 7.5 6.3z" />
            </svg>
            Saved recipes
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={doSignOut}
            className="flex min-h-[48px] w-full items-center gap-2.5 border-t border-forest/10 px-4 text-left text-[15px] font-medium text-forest transition hover:bg-forest/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-forest/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * MobileAuthSection — sign-in / account row at the top of the mobile menu.
 * `menuOpen` controls tabIndex so hidden controls aren't keyboard-focusable.
 */
function MobileAuthSection({ menuOpen, onNavigate }) {
  const { configured, user, loading, signInWithGoogle, signOut } = useAuth()
  if (!configured || loading) return null
  const tabIndex = menuOpen ? 0 : -1

  if (!user) {
    return (
      <div className="border-b border-forest/10 px-4 py-3">
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={() => {
            onNavigate()
            signInWithGoogle()
          }}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-full border border-forest/25 bg-cream-card px-6 py-2.5 text-sm font-semibold text-forest shadow-sm transition hover:border-forest"
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Sign in with Google
        </button>
        <p className="mt-2 text-center text-xs text-forest/60">
          Sync saved recipes &amp; meal plans across devices.
        </p>
      </div>
    )
  }

  const meta = user.user_metadata || {}
  const name = meta.given_name || (meta.full_name || '').split(' ')[0] || (user.email || 'You').split('@')[0]
  const avatar = meta.avatar_url
  const initial = (name || 'Y').charAt(0).toUpperCase()

  return (
    <div className="border-b border-forest/10 px-4 py-3">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest font-display text-base text-cream">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-forest">{name}</p>
          <p className="truncate text-xs text-forest/60">{user.email}</p>
        </div>
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={() => {
            onNavigate()
            signOut()
          }}
          className="inline-flex min-h-[44px] items-center rounded-full border border-forest/20 px-4 text-sm font-semibold text-forest transition hover:border-forest/50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

/**
 * Navbar. Anchors to home sections where the content lives there; plain routes elsewhere.
 * No dead "#" links - everything points at a real route.
 * Mobile: hamburger button opens a slide-down panel (accessible).
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  const onHome = pathname === '/'
  const anchor = (hash) => (onHome ? hash : `/${hash}`)
  const desktopLinks = [
    { label: 'Recipes', to: anchor('#recipes') },
    { label: 'Nutrients', to: anchor('#nutrients') },
    { label: 'Guides', to: '/guides/what-to-eat-for-iron-deficiency' },
    { label: 'Blog', to: '/blog' },
    { label: 'My Day', to: '/day-builder' },
    { label: 'Saved', to: '/saved' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ]
  // Mobile panel gets the full sitemap, including Home and Search.
  const mobileLinks = [
    { label: 'Home', to: '/' },
    { label: 'Recipes', to: '/recipes' },
    { label: 'Nutrients', to: anchor('#nutrients') },
    { label: 'Blog', to: '/blog' },
    { label: 'Guides', to: '/guides/what-to-eat-for-iron-deficiency' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
    { label: 'Search', to: '/search' },
    { label: 'My Day', to: '/day-builder' },
    { label: 'Saved', to: '/saved' },
  ]

  // Close the menu on route change.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Escape closes the menu and returns focus to the button.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (menuOpen) panelRef.current?.querySelector('a')?.focus()
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="The Recipe Seeker — home">
          <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="whitespace-nowrap font-display text-lg font-semibold leading-tight text-forest sm:text-xl">
            The Recipe Seeker
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {desktopLinks.map((l) => (
            <Link key={l.label} to={l.to} className="whitespace-nowrap text-[15px] font-medium text-forest/90 hover:text-ember">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden lg:contents">
            <UserChip />
            <SignInButton compact />
          </span>
          <Link
            to="/search"
            className="hidden rounded-full bg-ember-dark px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-md sm:block sm:px-5 sm:text-sm"
          >
            Search Recipes
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest transition hover:bg-forest/10 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Mobile slide-down panel */}
      <nav
        id="mobile-menu"
        ref={panelRef}
        aria-label="Mobile"
        className={`overflow-hidden bg-cream lg:hidden ${
          menuOpen ? 'border-t border-forest/10' : ''
        }`}
      >
        <div
          className={`transition-[max-height,opacity,visibility] duration-300 ease-out ${
            menuOpen ? 'visible max-h-[720px] opacity-100' : 'invisible max-h-0 opacity-0'
          }`}
        >
          <MobileAuthSection onNavigate={() => setMenuOpen(false)} />
          <ul className="px-4 pb-2">
            {mobileLinks.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[48px] items-center border-b border-forest/10 text-base font-medium text-forest transition last:border-0 hover:text-ember-dark"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
