#!/usr/bin/env node
/**
 * test-draft-gate.mjs — reproducible validation for the kitchen-test draft gate.
 *
 * The test injects a SYNTHETIC draft recipe into a backup copy of the seed so
 * the gate mechanics are proven end-to-end on any branch (including the
 * policy-only branch, whose seed contains no drafts). The seed is restored
 * and production artifacts rebuilt afterwards.
 *
 * Proves:
 *   1. a normal production build excludes drafts,
 *   2. a local preview build (INCLUDE_DRAFTS=true) includes drafts,
 *   3. INCLUDE_DRAFTS=true + VERCEL=1 fails with the exact policy error,
 *   4. INCLUDE_DRAFTS=true + CI=true fails with the exact policy error,
 *   5. INCLUDE_DRAFTS=true + VERCEL_ENV=preview fails,
 *   6. INCLUDE_DRAFTS=true + NODE_ENV=production fails.
 *
 * Run: `npm run test:draft-gate` (repo root).
 * Leaves the seed and artifacts in the production state on success or failure.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(ROOT, 'scripts', 'resolve-nutrition.mjs');
const SEED = join(ROOT, 'data', 'seed.mjs');
const SEED_BAK = join(ROOT, 'data', 'seed.mjs.bak-test');
const BUNDLE = join(ROOT, 'client', 'src', 'data', 'recipes.json');
const DRAFT_SLUG = '__synthetic-draft-gate-test__';
const POLICY_ERROR =
  'INCLUDE_DRAFTS=true is forbidden in CI or deployed builds. ' +
  'Draft recipes may be previewed locally only.';

const DEPLOY_VARS = ['CI', 'VERCEL', 'VERCEL_ENV', 'NODE_ENV'];

// Minimal recipe that passes every validation rule in resolve-nutrition.mjs.
const SYNTHETIC_DRAFT = `
  {
    slug: "${DRAFT_SLUG}",
    title: "Synthetic Draft Gate Test",
    description: "Temporary draft injected by test-draft-gate.mjs; never published.",
    image: "/images/test.jpg",
    imageAlt: "test",
    kitchenTested: false,
    source: "estimate-refresh-when-key-arrives",
    keyNutrients: [
      { key: "fiber", label: "1g Fiber" },
      { key: "protein", label: "1g Protein" },
      { key: "iron", label: "1mg Iron" },
    ],
    nutrition: {
      calories: { amount: 100, unit: "kcal", dv: 5 },
      protein: { amount: 1, unit: "g", dv: 2 },
      fat: { amount: 1, unit: "g", dv: 1 },
      carbs: { amount: 1, unit: "g", dv: 1 },
      fiber: { amount: 1, unit: "g", dv: 4 },
      sugar: { amount: 1, unit: "g", dv: 2 },
      sodium: { amount: 1, unit: "mg", dv: 1 },
      iron: { amount: 1, unit: "mg", dv: 6 },
      calcium: { amount: 1, unit: "mg", dv: 1 },
      vitaminC: { amount: 1, unit: "mg", dv: 1 },
      potassium: { amount: 1, unit: "mg", dv: 1 },
    },
    faqs: [],
    steps: ["Step one.", "Step two.", "Step three.", "Step four."],
    ingredients: [{ amount: "1", item: "test ingredient" }],
    whyItHelps: { goal: "testing", text: "test" },
  },
`;

function runBuild(extraEnv) {
  const env = { ...process.env, ...extraEnv };
  try {
    execFileSync('node', [BUILD], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    return { exit: 0, output: '' };
  } catch (e) {
    return { exit: e.status ?? 1, output: String(e.stdout || '') + String(e.stderr || '') };
  }
}

function bundleHasDraft() {
  const data = JSON.parse(readFileSync(BUNDLE, 'utf8'));
  return data.recipes.some((r) => r.slug === DRAFT_SLUG);
}

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail && !cond ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

function injectDraft() {
  copyFileSync(SEED, SEED_BAK);
  let seed = readFileSync(SEED, 'utf8');
  // Append the synthetic draft just before the closing of the recipes array.
  // The recipes array ends with "}\n]" right before "export const nutrients".
  const marker = 'export const nutrients';
  const idx = seed.indexOf(marker);
  if (idx === -1) throw new Error('seed marker not found');
  const before = seed.slice(0, idx);
  const recipesClose = before.lastIndexOf(']');
  if (recipesClose === -1) throw new Error('recipes array close not found');
  seed =
    seed.slice(0, recipesClose) +
    ',' +
    SYNTHETIC_DRAFT +
    '\n' +
    seed.slice(recipesClose);
  writeFileSync(SEED, seed);
}

function restoreSeed() {
  try {
    copyFileSync(SEED_BAK, SEED);
    unlinkSync(SEED_BAK);
  } catch { /* backup missing — nothing to restore */ }
}

function cleanDeployEnv(extra) {
  const env = { ...extra };
  for (const v of DEPLOY_VARS) if (!(v in extra)) env[v] = '';
  return env;
}

try {
  injectDraft();

  // 1. normal production build excludes the draft
  let r = runBuild(cleanDeployEnv({}));
  check('production build succeeds', r.exit === 0, `exit=${r.exit} ${r.output.slice(0, 200)}`);
  check('production build excludes draft', !bundleHasDraft());

  // 2. local preview build includes the draft (deploy indicators scrubbed)
  r = runBuild(cleanDeployEnv({ INCLUDE_DRAFTS: 'true' }));
  check('local preview build succeeds', r.exit === 0, `exit=${r.exit} ${r.output.slice(0, 200)}`);
  check('local preview build includes draft', bundleHasDraft());

  // 3-6. deployed/CI environments must reject INCLUDE_DRAFTS=true
  for (const [label, env] of [
    ['VERCEL=1', { INCLUDE_DRAFTS: 'true', VERCEL: '1' }],
    ['CI=true', { INCLUDE_DRAFTS: 'true', CI: 'true' }],
    ['VERCEL_ENV=preview', { INCLUDE_DRAFTS: 'true', VERCEL_ENV: 'preview' }],
    ['NODE_ENV=production', { INCLUDE_DRAFTS: 'true', NODE_ENV: 'production' }],
  ]) {
    r = runBuild(env);
    check(`INCLUDE_DRAFTS=true + ${label} fails`, r.exit !== 0, `exit=${r.exit}`);
    check(`INCLUDE_DRAFTS=true + ${label} prints policy error`, r.output.includes(POLICY_ERROR), 'message missing');
  }
} finally {
  restoreSeed();
  runBuild(cleanDeployEnv({})); // leave production artifacts in place
}

check('seed restored after test', !readFileSync(SEED, 'utf8').includes(DRAFT_SLUG));
check('artifacts restored to production state', !bundleHasDraft());

if (failures > 0) {
  console.error(`\ndraft-gate tests: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\ndraft-gate tests: all passed');
