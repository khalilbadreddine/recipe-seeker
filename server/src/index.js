/**
 * The Recipe Seeker — API server.
 *
 * Thin data layer over the static build artifact `data/recipes.json`
 * (produced by `npm run data:build`). No live USDA calls happen at request
 * time — all nutrition data is resolved at build time and baked into that file.
 *
 * Endpoints:
 *   GET  /api/health            → {ok:true}
 *   GET  /api/recipes           → array of recipe summaries
 *   GET  /api/recipes/:slug     → full recipe or 404
 *   GET  /api/search?nutrient=iron&min=5
 *   POST /api/subscribe         → {email}
 */
'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Load the build artifact (fail loudly at boot if it hasn't been built).
// ---------------------------------------------------------------------------
const DATA_PATH =
  process.env.RECIPE_DATA_PATH ||
  path.join(__dirname, '..', '..', 'data', 'recipes.json');

let store = null;
try {
  store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (err) {
  console.error(
    `[fatal] could not read recipe data at ${DATA_PATH}: ${err.message}\n` +
    '        run `npm run data:build` from the repo root first.'
  );
  process.exit(1);
}

const recipes = store.recipes || [];

// Valid nutrient keys for /api/search — derived from the data itself.
// Lookup is normalized (lowercase, no separators) so ?nutrient=vitamin-c,
// ?nutrient=vitaminC and ?nutrient=VitaminC all resolve to the same key.
const VALID_NUTRIENTS = new Map(); // normalized -> canonical key
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
for (const r of recipes) {
  for (const key of Object.keys(r.nutrition || {})) VALID_NUTRIENTS.set(norm(key), key);
}

function summary(r) {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    image: r.image,
    keyNutrients: r.keyNutrients,
    prepMinutes: r.prepMinutes,
    totalMinutes: r.totalMinutes,
    calories: r.calories,
    servings: r.servings,
    tags: r.tags,
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/recipes', (req, res) => {
  res.json(recipes.map(summary));
});

app.get('/api/recipes/:slug', (req, res) => {
  const recipe = recipes.find((r) => r.slug === req.params.slug);
  if (!recipe) return res.status(404).json({ error: 'recipe not found' });
  res.json(recipe);
});

app.get('/api/search', (req, res) => {
  const { nutrient, min } = req.query;

  if (!nutrient || typeof nutrient !== 'string') {
    return res.status(400).json({ error: 'query param "nutrient" is required' });
  }
  const canonicalNutrient = VALID_NUTRIENTS.get(norm(nutrient));
  if (!canonicalNutrient) {
    return res.status(400).json({
      error: `unknown nutrient "${nutrient}"`,
      valid: [...new Set(VALID_NUTRIENTS.values())].sort(),
    });
  }

  const minAmount = min === undefined ? 0 : Number(min);
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    return res.status(400).json({ error: 'query param "min" must be a non-negative number' });
  }

  const hits = recipes.filter((r) => {
    const n = (r.nutrition || {})[canonicalNutrient];
    return n && Number(n.amount) >= minAmount;
  });

  res.json(hits.map(summary));
});

// ---------------------------------------------------------------------------
// Email capture → SQLite
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const insertSubscriber = db.prepare(
  'INSERT INTO subscribers (email, created_at) VALUES (?, ?)'
);

app.post('/api/subscribe', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid email address' });
  }

  try {
    insertSubscriber.run(email, new Date().toISOString());
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: 'email already subscribed' });
    }
    throw err;
  }

  res.status(201).json({ email });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Optional same-origin frontend: if client/dist exists (i.e. `npm run build`
// was run), serve the prerendered site from this same server. This enables a
// single-service deploy (e.g. Render free tier) with zero CORS issues — the
// client's relative /api/* calls just work.
// ---------------------------------------------------------------------------
const DIST_DIR = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // Fallback for prerendered routes (/recipes/x, /nutrients/y, ...): serve the
  // matching index.html. Never swallows /api/* (those 404 as JSON below).
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    const asFile = path.join(DIST_DIR, req.path, 'index.html');
    if (fs.existsSync(asFile)) return res.sendFile(asFile);
    next();
  });
  console.log(`[recipe-seeker] serving static frontend from ${DIST_DIR}`);
}

app.use('/api', (req, res) => res.status(404).json({ error: 'unknown endpoint' }));

app.listen(PORT, () => {
  console.log(`[recipe-seeker] API listening on :${PORT} (${recipes.length} recipes loaded)`);
});
