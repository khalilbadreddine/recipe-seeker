/**
 * Small on-device helpers (localStorage): recently viewed recipes and
 * "Add to plan". SSR-safe: only call from effects or event handlers.
 */

const RECENT_KEY = 'rs-recent-v1'

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export function rememberRecipe(slug) {
  const list = read(RECENT_KEY, [])
  write(RECENT_KEY, [slug, ...(Array.isArray(list) ? list : []).filter((s) => s !== slug)].slice(0, 8))
}

export function recentRecipes() {
  const list = read(RECENT_KEY, [])
  return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : []
}

/** Best planner slot for a recipe, from its meal tags. */
export function slotFor(recipe) {
  const meals = recipe.tags?.meals || []
  if (meals.includes('dinner')) return 'dinner'
  if (meals.includes('lunch')) return 'lunch'
  if (meals.includes('breakfast') || meals.includes('brunch')) return 'breakfast'
  return 'snacks'
}

/** Put a recipe on today's plan (see lib/weekPlan.js). */
export { addToPlan as addToDay } from './weekPlan'
