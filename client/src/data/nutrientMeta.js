import { getNutrient, recipes } from './site'

/**
 * Visual identity per nutrient: every nutrient gets its own color, used for
 * chips, bars, hub headers and tiles. Colors are used as accents (dots,
 * bars, tinted backgrounds) with ink text on top, so contrast always comes
 * from the ink, never from the accent.
 */
export const NUTRIENT_META = {
  protein: { color: '#E0603A', short: 'Protein' },
  iron: { color: '#B4234A', short: 'Iron' },
  fiber: { color: '#3E8E41', short: 'Fiber' },
  vitaminC: { color: '#F0931A', short: 'Vit C' },
  calcium: { color: '#3B82C4', short: 'Calcium' },
  magnesium: { color: '#7A5AC8', short: 'Magnesium' },
  vitaminD: { color: '#D9A400', short: 'Vit D' },
  b12: { color: '#D6457E', short: 'B12' },
  zinc: { color: '#55778A', short: 'Zinc' },
  folate: { color: '#5E9E22', short: 'Folate' },
  potassium: { color: '#C27A1E', short: 'Potassium' },
  omega3: { color: '#178A9A', short: 'Omega-3' },
  vitaminA: { color: '#E07B1F', short: 'Vit A' },
}

const FALLBACK = { color: '#1F7A4A', short: '' }

/** Accepts a nutrient key ("vitaminC") or hub slug ("vitamin-c"). */
export function nutrientMeta(keyOrSlug) {
  if (NUTRIENT_META[keyOrSlug]) return NUTRIENT_META[keyOrSlug]
  const n = getNutrient(keyOrSlug)
  return (n && NUTRIENT_META[n.key]) || FALLBACK
}

/** Translucent tint of a hex color, for chip/tile backgrounds. */
export function tint(hex, alpha = 0.14) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Every recipe for a nutrient hub: curated list first, then any tagged recipe. */
export function recipesForNutrient(nutrient) {
  const curated = (nutrient.recipeSlugs || []).map((s) => recipes.find((r) => r.slug === s)).filter(Boolean)
  const seen = new Set(curated.map((r) => r.slug))
  const tagged = recipes.filter((r) => !seen.has(r.slug) && (r.tags.nutrients || []).includes(nutrient.key))
  return [...curated, ...tagged]
}

/** Recipes sorted by amount of a nutrient per serving, highest first. */
export function topRecipesBy(key, limit = 6) {
  return [...recipes]
    .filter((r) => r.nutrition[key])
    .sort((a, b) => (b.nutrition[key].amount || 0) - (a.nutrition[key].amount || 0))
    .slice(0, limit)
}

export const DIET_LABELS = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  'low-carb': 'Low-carb',
}

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert',
}
