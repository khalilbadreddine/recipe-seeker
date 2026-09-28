/**
 * Build-time data resolver — NO network calls, EVER.
 *
 * Reads `data/seed.mjs` (the single source of truth for recipes, nutrient
 * hubs and guides), validates its shape, then writes the assembled artifact:
 *   - data/recipes.json               (consumed by the Express API)
 *   - client/src/data/recipes.json    (bundled by the client at build time)
 *
 * PUBLISH POLICY (revised 2026-09-28 by owner order — the kitchen-test draft
 * gate was removed, see docs/kitchen-test-gate.md § "Superseded"):
 * every recipe in the seed is published. Recipes are researched/curated from
 * reputable sources (never invented) and their nutrition is calculated from
 * USDA FoodData Central ingredient data. No "untested" warnings are rendered
 * anywhere on the site; a positive "Tested in our kitchen" badge is shown
 * only when `kitchenTested: true` with documented evidence (validated below).
 *
 * Run from the repo root: `npm run data:build`
 *
 * Nutrition data flow: the seed's per-serving `nutrition` values were
 * composed at authoring time from USDA FoodData Central (see
 * scripts/fetch-hero-cache.cjs for the cached hero-ingredient pulls).
 * This script only assembles + validates — it never fetches.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recipes, nutrients, guides } from '../data/seed.mjs';

// Blog posts live in data/posts.json (separate from the recipe seed —
// they need no nutrition validation). Read once, validated in assertShape().
const posts = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'posts.json'), 'utf8')
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const CANONICAL_BASE = (() => {
  // Single source of truth: keep whatever canonicalBase is already in data/recipes.json
  // (set it there when the domain changes). Falls back to the live Vercel URL.
  try {
    const existing = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'recipes.json'), 'utf8')
    );
    if (existing?.site?.canonicalBase) return existing.site.canonicalBase;
  } catch { /* first run: no file yet */ }
  return 'https://recipe-seeker-client.vercel.app';
})();
const LASTMOD = '2026-09-17';

// Every recipe must carry these nutrient keys (per serving).
const REQUIRED_NUTRIENT_KEYS = [
  'calories', 'protein', 'fat', 'carbs', 'fiber',
  'sugar', 'sodium', 'iron', 'calcium', 'vitaminC', 'potassium',
];
const VALID_SOURCES = new Set(['cached-verified', 'estimate-refresh-when-key-arrives']);

const failures = [];
const fail = (msg) => failures.push(msg);
const warnings = [];
const warn = (msg) => warnings.push(msg);

// Evidence required to flip a recipe from draft to publishable.
// See docs/kitchen-test-gate.md for what each field must contain.
const KITCHEN_TEST_EVIDENCE_FIELDS = [
  'tester',               // name or role of the person who cooked it
  'date',                 // test date (YYYY-MM-DD)
  'confirmedQuantities',  // ingredient quantities verified as written
  'confirmedTimes',       // prep/cook/total time verified as written
  'confirmedServings',    // serving count verified as written
  'changesFromDraft',     // what changed vs the draft (or "none")
  'finalPhoto',           // path to the real-dish photo, or a note why none exists
];

function assertShape() {
  // --- counts ------------------------------------------------------------
  // NOTE: no fixed recipe count here. A hardcoded count couples the build to
  // the seed size and breaks the policy/recipe split (the policy branch ships
  // 50 recipes; recipe drafts arrive in separate PRs). Per-recipe validation
  // below plus the duplicate-slug check is the real safety net.
  if (recipes.length === 0) fail('no recipes in seed');
  if (nutrients.length !== 12) fail(`expected 12 nutrient hubs, got ${nutrients.length}`);
  if (guides.length !== 2) fail(`expected 2 guides, got ${guides.length}`);

  const slugs = new Set();
  for (const r of recipes) {
    if (!r.slug) fail('recipe missing slug');
    if (slugs.has(r.slug)) fail(`duplicate recipe slug "${r.slug}"`);
    slugs.add(r.slug);

    for (const f of ['title', 'description', 'image', 'imageAlt']) {
      if (!r[f]) fail(`recipe ${r.slug}: missing ${f}`);
    }
    if (!Array.isArray(r.keyNutrients) || r.keyNutrients.length < 3) {
      fail(`recipe ${r.slug}: need 3-4 keyNutrients badges`);
    }
    if (!r.nutrition) fail(`recipe ${r.slug}: missing nutrition`);
    else {
      for (const k of REQUIRED_NUTRIENT_KEYS) {
        const n = r.nutrition[k];
        if (!n || typeof n.amount !== 'number' || !n.unit || typeof n.dv !== 'number') {
          fail(`recipe ${r.slug}: nutrition.${k} malformed or missing`);
        }
      }
    }
    // FAQs are OPTIONAL. Quality bar, not a count bar:
    // - 0 FAQs if the recipe is already fully clear; 2-4 is typical.
    // - Up to 6 only where readers genuinely need troubleshooting,
    //   substitutions, storage, dietary clarification, or make-ahead guidance.
    // - Each FAQ must answer a question NOT already clearly answered in the
    //   ingredients, instructions, notes, or storage guidance, and must add
    //   material practical value. Never add FAQs for SEO/schema padding.
    // (A minimum-FAQ rule was removed: floors pressure authors into inventing
    //  questions, the classic AI-slop pattern. See docs/kitchen-test-gate.md.)
    if (!Array.isArray(r.faqs)) {
      fail(`recipe ${r.slug}: faqs must be an array (may be empty)`);
    } else if (r.faqs.length > 6) {
      warn(`recipe ${r.slug}: ${r.faqs.length} FAQs exceeds the guideline max of 6 — trim to genuine reader questions`);
    }
    // Kitchen-tested badge honesty check: `kitchenTested: true` (which renders
    // the positive "Tested in our kitchen" badge on the page) requires
    // documented evidence (fields above). There is no draft state — every
    // recipe in the seed is published.
    if (r.kitchenTested === true) {
      const kt = r.kitchenTest || {};
      for (const f of KITCHEN_TEST_EVIDENCE_FIELDS) {
        if (kt[f] === undefined || kt[f] === null || kt[f] === '') {
          fail(`recipe ${r.slug}: kitchenTested=true requires kitchenTest.${f} (see docs/kitchen-test-gate.md)`);
        }
      }
    }
    if (!VALID_SOURCES.has(r.source)) {
      fail(`recipe ${r.slug}: source must be one of ${[...VALID_SOURCES].join(', ')}`);
    }
    if (!Array.isArray(r.steps) || r.steps.length < 4) {
      fail(`recipe ${r.slug}: need 4-6 steps`);
    }
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
      fail(`recipe ${r.slug}: missing ingredients`);
    }
    if (!r.whyItHelps?.goal || !r.whyItHelps?.text) {
      fail(`recipe ${r.slug}: missing whyItHelps`);
    }
  }

  // --- cross-references ----------------------------------------------------
  for (const n of nutrients) {
    for (const s of n.recipeSlugs || []) {
      if (!slugs.has(s)) fail(`nutrient ${n.key}: unknown recipe slug "${s}"`);
    }
  }
  for (const g of guides) {
    for (const s of g.relatedRecipes || []) {
      if (!slugs.has(s)) fail(`guide ${g.slug}: unknown recipe slug "${s}"`);
    }
    if (!Array.isArray(g.faqs) || g.faqs.length < 8) {
      fail(`guide ${g.slug}: need 8+ FAQs`);
    }
  }

  // --- blog posts (from data/posts.json, not seed.mjs) -----------------------
  const recipeSlugs = new Set(slugs); // snapshot before post slugs are added
  for (const p of posts) {
    if (!p.slug) fail('post missing slug');
    if (slugs.has(p.slug)) fail(`duplicate post slug "${p.slug}"`);
    slugs.add(p.slug);
    for (const f of ['title', 'description', 'lede', 'category', 'image']) {
      if (!p[f]) fail(`post ${p.slug}: missing ${f}`);
    }
    if (!Array.isArray(p.sections) || p.sections.length === 0) {
      fail(`post ${p.slug}: need 1+ sections`);
    }
    for (const [i, s] of (p.sections || []).entries()) {
      if (!s.h2 || !Array.isArray(s.paragraphs) || s.paragraphs.length === 0) {
        fail(`post ${p.slug}: section ${i} needs h2 + paragraphs`);
      }
    }
    if (!Array.isArray(p.faqs) || p.faqs.length < 4) {
      fail(`post ${p.slug}: need 4+ FAQs, got ${(p.faqs || []).length}`);
    }
    for (const s of p.relatedRecipes || []) {
      if (!recipeSlugs.has(s)) fail(`post ${p.slug}: unknown recipe slug "${s}"`);
    }
    const imgPath = path.join(ROOT, 'client', 'public', String(p.image || '').replace(/^\//, ''));
    if (!fs.existsSync(imgPath)) fail(`post ${p.slug}: image not found: ${p.image}`);
  }
}

assertShape();
if (failures.length > 0) {
  console.error('seed validation FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
if (warnings.length > 0) {
  console.warn('seed validation warnings:');
  for (const w of warnings) console.warn('  ! ' + w);
}

// --- publish ----------------------------------------------------------------
// Policy 2026-09-28 (owner order): the kitchen-test draft gate is removed.
// Every recipe in the seed is published to both artifacts — no exclusions,
// no preview flags.
const outRecipes = recipes;
const outNutrients = nutrients;
const outGuides = guides;
const outPosts = posts;

const artifact = {
  site: {
    name: 'The Recipe Seeker',
    tagline: 'Find recipes by what your body needs.',
    canonicalBase: CANONICAL_BASE,
  },
  meta: {
    // Note: no generatedAt timestamp here — the artifact must be byte-identical
    // across runs so builds stay reproducible and don't dirty the tree.
    recipes: recipes.length,
  },
  recipes: outRecipes,
  nutrients: outNutrients,
  guides: outGuides,
  posts: outPosts,
};

const targets = [
  path.join(ROOT, 'data', 'recipes.json'),
  path.join(ROOT, 'client', 'src', 'data', 'recipes.json'),
];

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, t)}`);
}

// Honesty report: how many recipes are estimates vs API-verified.
const estimated = recipes.filter((r) => r.source === 'estimate-refresh-when-key-arrives');
const verified = recipes.filter((r) => r.source === 'cached-verified');
console.log(
  `OK: ${recipes.length} recipes published, ` +
  `${nutrients.length} nutrient hubs, ${guides.length} guides, ${posts.length} posts — ` +
  `${verified.length} cached-verified, ${estimated.length} estimate-refresh-when-key-arrives`
);
