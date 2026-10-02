import { useEffect, useReducer } from 'react'

/**
 * Per-page detail data (full recipe / post / guide), keyed "recipes/<slug>".
 *
 * - Prerender seeds the cache for the page being rendered and embeds the same
 *   object in the HTML (<script id="page-data">); main.jsx seeds it again
 *   before hydrating, so the first render matches the static HTML exactly.
 * - Client-side navigation fetches /data/<kind>/<slug>.json once and caches it.
 */
const cache = new Map()
const failed = new Set()
const inflight = new Map()

export function seedDetails(entries) {
  for (const [key, value] of Object.entries(entries || {})) cache.set(key, value)
}

export function loadDetail(kind, slug) {
  const key = `${kind}/${slug}`
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fetch(`/data/${key}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => {
          cache.set(key, data)
          failed.delete(key)
          return data
        })
        .catch((e) => {
          failed.add(key)
          throw e
        })
        .finally(() => inflight.delete(key)),
    )
  }
  return inflight.get(key)
}

/** Warm the cache (e.g. on hover) without caring about the result. */
export function prefetchDetail(kind, slug) {
  if (typeof window === 'undefined' || !slug) return
  loadDetail(kind, slug).catch(() => {})
}

/** { data, error } for one item; data is null while loading. */
export function useDetail(kind, slug) {
  const key = `${kind}/${slug}`
  const [, rerender] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    if (!slug || cache.has(key)) return
    let alive = true
    loadDetail(kind, slug)
      .catch(() => {})
      .finally(() => alive && rerender())
    return () => {
      alive = false
    }
  }, [kind, slug, key])
  return { data: cache.get(key) || null, error: failed.has(key) && !cache.has(key) }
}
