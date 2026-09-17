import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  configured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

/**
 * AuthProvider — Google OAuth via Supabase. SSR-safe: session is only read
 * on the client after mount; the prerendered HTML always renders logged-out.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const clientRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let mounted = true
    let subscription = null
    getSupabase().then((client) => {
      if (!mounted) return
      if (!client) {
        setLoading(false)
        return
      }
      clientRef.current = client
      client.auth.getSession().then(({ data }) => {
        if (mounted) {
          setSession(data.session ?? null)
          setLoading(false)
        }
      })
      const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (mounted) setSession(nextSession ?? null)
      })
      subscription = data.subscription
    })
    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const client = await getSupabase()
    if (!client) return
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    const client = clientRef.current || (await getSupabase())
    if (!client) return
    await client.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        configured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
