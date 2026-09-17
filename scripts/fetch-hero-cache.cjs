/**
 * One-off dev utility: populate the SQLite USDA cache with per-100g
 * nutrient profiles for the hero ingredient of each seed recipe.
 *
 * Run once from the repo root: `node scripts/fetch-hero-cache.cjs`
 *
 * DEMO_KEY is capped at ~30 requests/hour, so this does 10 requests with a
 * 2-second pause between them and caches everything in server/data/app.db.
 * The build (`resolve-nutrition.mjs`) never calls the network — it only
 * reads this cache. Re-run after adding FDC_API_KEY to .env to refresh.
 */
'use strict';

const usda = require('../server/src/usda');

const HEROES = [
  { name: 'salmon',      query: 'salmon atlantic raw',      match: /salmon/i },
  { name: 'chickpea',    query: 'chickpeas mature seeds raw', match: /chickpea/i },
  { name: 'lentil',      query: 'lentils raw',              match: /lentil/i },
  { name: 'greek-yogurt',query: 'yogurt greek plain whole milk', match: /yogurt.*greek/i },
  { name: 'chicken-breast', query: 'chicken breast raw',    match: /chicken.*breast/i },
  { name: 'farro',       query: 'farro cooked',             match: /farro|spelt/i },
  { name: 'avocado',     query: 'avocado raw',              match: /avocado/i },
  { name: 'black-bean',  query: 'black beans raw',          match: /beans.*black|black.*bean/i },
  { name: 'oats',        query: 'oats raw',                 match: /oats/i },
  { name: 'spinach',     query: 'spinach raw',              match: /spinach/i },
  { name: 'tuna',        query: 'tuna yellowfin raw',       match: /tuna/i },
  { name: 'red-lentil',  query: 'red lentils raw',          match: /lentil/i },
  // --- batch 2: hero ingredients for the 12 new recipes (2026-09-17) ---
  { name: 'ground-beef', query: 'beef ground 90% lean raw', match: /beef.*ground|ground.*beef/i },
  { name: 'quinoa',      query: 'quinoa cooked',            match: /quinoa/i },
  { name: 'white-bean',  query: 'white beans cooked',       match: /beans.*white|white.*bean/i },
  { name: 'tofu',        query: 'tofu firm raw',            match: /tofu/i },
  { name: 'egg',         query: 'egg whole raw',            match: /egg/i },
  { name: 'pumpkin-seed',query: 'pumpkin seeds raw',        match: /pumpkin.*seed/i },
  { name: 'sardine',     query: 'sardine atlantic canned in oil', match: /sardine/i },
  { name: 'chia-seed',   query: 'chia seeds dried',         match: /chia/i },
  { name: 'sweet-potato',query: 'sweet potato raw unprepared', match: /^sweet potato, raw/i },
  { name: 'mushroom',    query: 'mushrooms white raw',  match: /mushrooms, white, raw/i },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (const h of HEROES) {
    const result = await usda.getNutrientsForIngredient(h.query, h.match);
    if (result) {
      console.log(`OK   ${h.name}: "${result.description}" (fdcId ${result.fdcId})`);
    } else {
      console.log(`MISS ${h.name}: no usable entry`);
    }
    await sleep(2000);
  }
  console.log('done.');
})();
