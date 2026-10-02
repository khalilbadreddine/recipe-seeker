/**
 * Small on-device helpers (localStorage): recently viewed recipes and
 * "Add to My Day". SSR-safe: only call from effects or event handlers.
 */

const RECENT_KEY = 'rs-recent-v1'
const DAY_KEY = 'rs-day-v1' // same key and shape as DayBuilderPage

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

const SLOT_CAPACITY = { breakfast: 1, lunch: 1, dinner: 1, snacks: 2 }

/** Best My Day slot for a recipe, from its meal tags. */
export function slotFor(recipe) {
  const meals = recipe.tags?.meals || []
  if (meals.includes('dinner')) return 'dinner'
  if (meals.includes('lunch')) return 'lunch'
  if (meals.includes('breakfast') || meals.includes('brunch')) return 'breakfast'
  return 'snacks'
}

/**
 * Put a recipe into today's My Day plan. Single-recipe slots are replaced;
 * snacks keep the newest two. The Day Builder reads this on load, and when
 * signed in it pushes the local plan to the cloud (local wins).
 */
export function addToDay(slug, slot) {
  const day = read(DAY_KEY, null)
  const plan = { breakfast: [], lunch: [], dinner: [], snacks: [], ...(day && typeof day === 'object' ? day : {}) }
  const cap = SLOT_CAPACITY[slot] || 1
  plan[slot] = [slug, ...(Array.isArray(plan[slot]) ? plan[slot] : []).filter((s) => s !== slug)].slice(0, cap)
  write(DAY_KEY, plan)
}
