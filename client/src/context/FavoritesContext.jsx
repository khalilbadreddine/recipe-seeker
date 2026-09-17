import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'rs-favs-v1'

const FavoritesContext = createContext({
  favorites: [],
  ready: false,
  isFavorite: () => false,
  toggleFavorite: async () => {},
})

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function writeLocal(slugs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    /* storage unavailable — favorites still work for the session */
  }
}

/**
 * FavoritesProvider — heart/save system.
 * - Supabase not configured, or user logged out → localStorage (`rs-favs-v1`).
 * - User logged in → Supabase `favorites` table is the source of truth.
 * On sign-in, local favorites are merged into the cloud (missing rows inserted),
 * then the cloud becomes the source of truth. SSR-safe: everything runs on mount.
 */
export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [ready, setReady] = useState(false)
  const mergedForUser = useRef(null)

  // Initial load: localStorage (instant, SSR-safe default).
  useEffect(() => {
    setFavorites(readLocal())
    setReady(true)
  }, [])

  // On sign-in: merge local favorites into the cloud once per user.
  useEffect(() => {
    if (!isSupabaseConfigured || !user || typeof window === 'undefined') return
    if (mergedForUser.current === user.id) return
    mergedForUser.current = user.id
    ;(async () => {
      const client = await getSupabase()
      const local = readLocal()
      let cloud = []
      try {
        const { data, error } = await client
          .from('favorites')
          .select('recipe_slug')
          .eq('user_id', user.id)
        if (!error && data) cloud = data.map((r) => r.recipe_slug)
      } catch {
        /* offline — keep local state */
      }
      const union = [...new Set([...cloud, ...local])]
      const missing = union.filter((s) => !cloud.includes(s))
      if (missing.length > 0) {
        try {
          await client.from('favorites').upsert(
            missing.map((recipe_slug) => ({ user_id: user.id, recipe_slug })),
            { onConflict: 'user_id,recipe_slug' }
          )
        } catch {
          /* offline — will retry on next toggle/load */
        }
      }
      setFavorites(union)
      writeLocal(union)
    })()
  }, [user])

  // On sign-out: fall back to the local list.
  useEffect(() => {
    if (!user && mergedForUser.current) {
      mergedForUser.current = null
      setFavorites(readLocal())
    }
  }, [user])

  const isFavorite = useCallback((slug) => favorites.includes(slug), [favorites])

  const toggleFavorite = useCallback(
    async (slug) => {
      const next = favorites.includes(slug)
        ? favorites.filter((s) => s !== slug)
        : [...favorites, slug]
      setFavorites(next)
      writeLocal(next)
      if (isSupabaseConfigured && user) {
        try {
          const client = await getSupabase()
          if (!client) return
          if (favorites.includes(slug)) {
            await client.from('favorites').delete().eq('user_id', user.id).eq('recipe_slug', slug)
          } else {
            await client
              .from('favorites')
              .upsert({ user_id: user.id, recipe_slug: slug }, { onConflict: 'user_id,recipe_slug' })
          }
        } catch {
          /* offline — local state kept; cloud syncs on next toggle/load */
        }
      }
    },
    [favorites, user]
  )

  return (
    <FavoritesContext.Provider value={{ favorites, ready, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
