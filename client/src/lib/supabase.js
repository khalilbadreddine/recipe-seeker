const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** True when Supabase is configured; false → the app runs fully on localStorage. */
export const isSupabaseConfigured = Boolean(url && key)

let clientPromise = null

/**
 * Lazily creates the Supabase client (loaded as a separate JS chunk only when
 * actually needed, keeping the main bundle lean). Resolves to null when
 * Supabase isn't configured. Safe to call during SSR/prerender — the dynamic
 * import only runs in effects on the client.
 */
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, key)
    )
  }
  return clientPromise
}
