/**
 * USDA FoodData Central client (build-time use only).
 *
 * - `fetchNutrients(query)` hits the FDC search endpoint and caches the raw
 *   JSON payload in SQLite (`usda_cache`). Cache key: `fdc:<query>`.
 * - On HTTP 429 (rate limit) it falls back to whatever is cached and never
 *   throws — the build must never crash because the API throttled us.
 * - `getNutrientsForIngredient(name, matchRe?)` returns a normalized per-100g
 *   nutrient object, or `null` when nothing usable was found.
 *
 * API key resolution: `process.env.FDC_API_KEY`, else `DEMO_KEY`
 * (DEMO_KEY is hard-capped at ~30 requests/hour — cache aggressively).
 *
 * Only `Foundation` and `SR Legacy` data types are requested: these are the
 * stable, lab-analyzed datasets (no brand noise).
 */
'use strict';

const db = require('./db');

const API_BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// USDA nutrient IDs → our normalized keys (all values per 100 g).
const NUTRIENT_MAP = {
  1008: ['calories', 'kcal'],
  1003: ['protein_g', 'g'],
  1004: ['fat_g', 'g'],
  1005: ['carbs_g', 'g'],
  1079: ['fiber_g', 'g'],
  2000: ['sugar_g', 'g'],
  1093: ['sodium_mg', 'mg'],
  1089: ['iron_mg', 'mg'],
  1087: ['calcium_mg', 'mg'],
  1162: ['vitaminC_mg', 'mg'],
  1092: ['potassium_mg', 'mg'],
};

function apiKey() {
  return process.env.FDC_API_KEY || 'DEMO_KEY';
}

function cacheGet(key) {
  const row = db.prepare('SELECT payload FROM usda_cache WHERE key = ?').get(key);
  return row ? JSON.parse(row.payload) : null;
}

function cacheSet(key, payload) {
  db.prepare(
    'INSERT INTO usda_cache (key, payload, fetched_at) VALUES (?, ?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at'
  ).run(key, JSON.stringify(payload), new Date().toISOString());
}

/**
 * Fetch raw FDC search results for a query string, with SQLite caching.
 * Never throws: returns cached data on 429, `null` on other failures.
 */
async function fetchNutrients(query) {
  const key = `fdc:${query.toLowerCase().trim()}`;
  const url =
    `${API_BASE}?query=${encodeURIComponent(query)}` +
    `&api_key=${encodeURIComponent(apiKey())}` +
    `&pageSize=5&dataType=Foundation,SR%20Legacy`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    // Network failure — serve cache, never crash.
    console.warn(`[usda] network error for "${query}": ${err.message}; using cache`);
    return cacheGet(key);
  }

  if (res.status === 429) {
    const cached = cacheGet(key);
    console.warn(`[usda] 429 rate-limited for "${query}"; using cache (${cached ? 'hit' : 'miss'})`);
    return cached;
  }

  if (!res.ok) {
    console.warn(`[usda] HTTP ${res.status} for "${query}"; using cache`);
    return cacheGet(key);
  }

  const payload = await res.json();
  cacheSet(key, payload);
  return payload;
}

/**
 * Pick the best food entry from search results.
 * `matchRe` (optional) is tested against the food description so a noisy
 * first hit (e.g. "Fish oil, salmon" for query "salmon") can be skipped.
 */
function pickFood(payload, matchRe) {
  const foods = (payload && payload.foods) || [];
  if (foods.length === 0) return null;
  if (matchRe) {
    const hit = foods.find((f) => matchRe.test(f.description || ''));
    if (hit) return hit;
  }
  return foods[0];
}

/**
 * Normalize a food entry's nutrients to per-100g values:
 * {calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g,
 *  sodium_mg, iron_mg, calcium_mg, vitaminC_mg, potassium_mg}
 * Missing nutrients become 0 (caller decides what to do with that).
 * Returns null when no usable entry was found.
 */
async function getNutrientsForIngredient(name, matchRe) {
  const payload = await fetchNutrients(name);
  const food = pickFood(payload, matchRe);
  if (!food || !Array.isArray(food.foodNutrients)) return null;

  const out = {};
  for (const [id, [key]] of Object.entries(NUTRIENT_MAP)) out[key] = 0;

  for (const n of food.foodNutrients) {
    const mapped = NUTRIENT_MAP[n.nutrientId];
    if (!mapped) continue;
    const [key] = mapped;
    // FDC nutrient values are already per 100 g for these data types.
    if (typeof n.value === 'number') out[key] = Math.round(n.value * 100) / 100;
  }

  return {
    description: food.description,
    fdcId: food.fdcId,
    dataType: food.dataType,
    nutrients: out,
  };
}

module.exports = { fetchNutrients, getNutrientsForIngredient, cacheGet, cacheSet };
