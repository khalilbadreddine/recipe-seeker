/**
 * Splits src/data/recipes.json into:
 *   - a slim index every page ships with (cards, search, chat, planner), and
 *   - one detail object per recipe/post/guide, loaded only on its own page.
 * Used by the Vite plugin in vite.config.js and by scripts/prerender.mjs.
 */

const RECIPE_SUMMARY = [
  'slug', 'title', 'description', 'image', 'imageAlt', 'prepMinutes', 'cookMinutes', 'totalMinutes',
  'servings', 'calories', 'nutrition', 'keyNutrients', 'tags', 'datePublished', 'dateModified', 'kitchenTested',
]

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

/** Reading time at 200 wpm (minimum 1). */
export function readMinutes(post) {
  let words = String(post.lede || '').split(/\s+/).length
  for (const s of post.sections || []) {
    words += String(s.h2 || '').split(/\s+/).length
    for (const p of s.paragraphs || []) words += p.split(/\s+/).length
    for (const item of s.list || []) words += item.split(/\s+/).length
  }
  return Math.max(1, Math.round(words / 200))
}

export function buildSiteIndex(data) {
  return {
    site: data.site,
    meta: data.meta,
    recipes: data.recipes.map((r) => ({
      ...pick(r, RECIPE_SUMMARY),
      ingredientNames: (r.ingredients || []).map((i) => i.item),
    })),
    nutrients: data.nutrients,
    guides: (data.guides || []).map((g) => ({
      ...pick(g, ['slug', 'title', 'description', 'datePublished', 'dateModified']),
      sectionCount: (g.sections || []).length,
    })),
    posts: (data.posts || []).map((p) => ({
      ...pick(p, ['slug', 'title', 'description', 'category', 'image', 'datePublished', 'dateModified']),
      readMinutes: readMinutes(p),
    })),
  }
}

export const DETAIL_KINDS = ['recipes', 'posts', 'guides']

/**
 * Detail for one route, keyed like the client cache ("recipes/<slug>"), or {}.
 * `ratingStats` (slug → { rating_avg, rating_count }) is attached to recipes.
 */
export function detailForRoute(data, route, ratingStats = {}) {
  const m = route.match(/^\/(recipes|blog|guides)\/([a-z0-9-]+)\/?$/)
  if (!m) return {}
  const kind = m[1] === 'blog' ? 'posts' : m[1]
  const item = (data[kind] || []).find((x) => x.slug === m[2])
  if (!item) return {}
  const stats = kind === 'recipes' ? ratingStats[item.slug] : null
  return { [`${kind}/${item.slug}`]: stats ? { ...item, ratingStats: stats } : item }
}

/**
 * Public rating totals from Supabase (recipe_rating_stats view) at build time.
 * Uses the public (publishable) key. Any failure → {} so builds never break.
 */
export async function fetchRatingStats(env = process.env) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return {}
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/recipe_rating_stats?select=recipe_slug,rating_avg,rating_count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
    })
    if (!res.ok) return {}
    const rows = await res.json()
    return Object.fromEntries(rows.map((r) => [r.recipe_slug, { rating_avg: Number(r.rating_avg), rating_count: r.rating_count }]))
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}
