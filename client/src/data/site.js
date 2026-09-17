import rawData from './recipes.json'

// TODO: replace with the real production domain once DNS is live.
// All canonicals, OG/Twitter URLs and sitemap entries are derived from this one constant.
export const SITE_URL = rawData.site.canonicalBase || 'https://recipe-seeker-client.vercel.app'

export const site = rawData.site
export const recipes = rawData.recipes
export const nutrients = rawData.nutrients
export const guides = rawData.guides
export const posts = rawData.posts || []

export const getRecipe = (slug) => recipes.find((r) => r.slug === slug)
export const getNutrient = (key) => nutrients.find((n) => n.slug === key || n.key === key)
export const getGuide = (slug) => guides.find((g) => g.slug === slug)
export const getPost = (slug) => posts.find((p) => p.slug === slug)

export const absUrl = (path) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
export const absImage = (path) => absUrl(path)

export const formatAmount = (amount, unit) => {
  const a = Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 10) / 10)
  return unit === 'kcal' ? `${a} ${unit}` : `${a}${unit}`
}

/** All routes that must exist as static HTML after prerendering. */
export function getIncludedRoutes() {
  const routes = ['/', '/recipes', '/nutrients', '/search', '/about', '/disclaimer', '/privacy', '/contact', '/blog', '/fibermax-reset']
  recipes.forEach((r) => routes.push(`/recipes/${r.slug}`))
  nutrients.forEach((n) => routes.push(`/nutrients/${n.slug || n.key}`))
  guides.forEach((g) => routes.push(`/guides/${g.slug}`))
  posts.forEach((p) => routes.push(`/blog/${p.slug}`))
  return routes
}
