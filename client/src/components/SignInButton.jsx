import React from 'react'
import { useAuth } from '../context/AuthContext'

/** Official-style Google "G" mark as inline SVG (no emoji). */
export function GoogleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.7 2.9v.1C3.4 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.7-2.9-.1.1C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.7 1.3 6.6l3.9 3c1-2.9 3.7-5 6.8-5z"
      />
    </svg>
  )
}

/**
 * SignInButton — "Sign in with Google", on-brand cream/forest styling.
 * Renders nothing when Supabase isn't configured or a user is signed in.
 */
export default function SignInButton({ className = '', compact = false }) {
  const { configured, user, loading, signInWithGoogle } = useAuth()
  if (!configured || loading || user) return null
  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-full border border-forest/25 bg-cream-card font-semibold text-forest shadow-sm transition hover:border-forest hover:shadow-md ${
        compact ? 'px-4 py-2 text-[13px] sm:text-sm' : 'px-6 py-3 text-sm'
      } ${className}`}
    >
      <GoogleIcon className="h-5 w-5 shrink-0" />
      Sign in with Google
    </button>
  )
}
