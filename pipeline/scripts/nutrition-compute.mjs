/**
 * One-off USDA nutrition calculator for operator drafts.
 * Loads FDC_API_KEY from server/.env, uses server/src/usda.js (Foundation/SR Legacy only).
 * Verifies every picked record reports an energy value (PR #16 lesson).
 * Usage: node pipeline/scripts/nutrition-compute.mjs
 * Edit the RECIPES array below per run.
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env (FDC_API_KEY lives there)
const serverEnv = path.join(__dirname, '..', '..', 'server', '.env');
if (fs.existsSync(serverEnv)) {
  for (const line of fs.readFileSync(serverEnv, 'utf8').split('\n')) {
    if (/^\s*#/.test(line) || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !(v.startsWith('<')) && process.env[k] === undefined) process.env[k] = v;
  }
}
const require = createRequire(import.meta.url);
const { getNutrientsForIngredient } = require(path.join(__dirname, '..', '..', 'server', 'src', 'usda.js'));

const RECIPES = [
  {
    slug: 'high-protein-stuffed-acorn-squash',
    servings: 4,
    ingredients: [
      { label: 'acorn squash (2 medium, halved, edible flesh)', query: 'acorn squash raw', grams: 700, match: /squash, acorn/i },
      { label: 'quinoa, uncooked (1 cup = 170 g dry)', query: 'quinoa uncooked', grams: 170, match: /quinoa, uncooked/i },
      { label: 'lean ground turkey (1 lb, 93% lean)', query: 'turkey ground 93 lean raw', grams: 454, match: /turkey.*ground/i },
      { label: 'chickpeas, cooked/drained (1 can)', query: 'chickpeas cooked', grams: 240, match: /chickpea/i },
      { label: 'spinach, raw (2 cups)', query: 'spinach raw', grams: 60, match: /spinach/i },
      { label: 'onion (1 small)', query: 'onion raw', grams: 100, match: /onion/i },
      { label: 'garlic (2 cloves)', query: 'garlic raw', grams: 6, match: /garlic/i },
      { label: 'olive oil (2 tbsp)', query: 'oil olive salad or cooking', grams: 27, match: /oil, olive, salad or cooking/i },
      { label: 'smoked paprika (1 tsp)', query: 'paprika smoked', grams: 2, match: /paprika/i },
      { label: 'ground cumin (1 tsp)', query: 'cumin ground', grams: 2, match: /cumin/i },
    ],
  },
];

const KEYS = ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'iron_mg', 'calcium_mg', 'vitaminC_mg', 'potassium_mg'];

async function main() {
  for (const r of RECIPES) {
    console.log(`\n===== ${r.slug} (${r.servings} servings) =====`);
    const totals = Object.fromEntries(KEYS.map((k) => [k, 0]));
    let ok = true;
    for (const ing of r.ingredients) {
      const res = await getNutrientsForIngredient(ing.query, ing.match);
      if (!res) { console.log(`  !! MISS: ${ing.label}`); ok = false; continue; }
      const n = res.nutrients;
      const hasEnergy = n.calories > 0;
      console.log(`  ${ing.label}: [${res.fdcId}] ${res.description} (${res.dataType}) energy=${n.calories}${hasEnergy ? '' : ' !! NO ENERGY ROW'}`);
      if (!hasEnergy) ok = false;
      for (const k of KEYS) totals[k] += (n[k] || 0) * (ing.grams / 100);
      await new Promise((r2) => setTimeout(r2, 700)); // rate-limit courtesy
    }
    const per = Object.fromEntries(KEYS.map((k) => [k, Math.round((totals[k] / r.servings) * 10) / 10]));
    console.log('PER SERVING:', JSON.stringify(per));
    const atwater = 4 * per.protein_g + 9 * per.fat_g + 4 * per.carbs_g;
    const dev = Math.abs(atwater - per.calories) / per.calories;
    console.log(`ATWATER check: macros->${Math.round(atwater)} vs reported ${per.calories} (dev ${(dev * 100).toFixed(1)}%) ${dev > 0.12 ? '!! FAIL >12%' : 'ok'}`);
    console.log(`energy-verified picks: ${ok}`);
  }
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
