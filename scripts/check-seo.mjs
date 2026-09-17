/**
 * SEO smoke-test for the prerendered client build.
 *
 * Usage: `node scripts/check-seo.mjs [distDir]`  (default: client/dist)
 *
 * For every expected route page (vite-ssg emits either nested
 * `recipes/<slug>/index.html` or flat `recipes/<slug>.html` — both are
 * accepted), it asserts:
 *   (a) an <h1> exists in the HTML
 *   (b) a <script type="application/ld+json"> exists
 *       (required on recipe/nutrient/guide pages; warn-only on / and /search)
 *   (c) no "#/" hash-route links
 *   (d) internal navigation uses <a href> (heuristic fail on
 *       `onClick` + `navigate(` patterns found in HTML)
 * and asserts sitemap.xml / robots.txt / llms.txt / llms-full.txt exist.
 *
 * Prints PASS/FAIL per check with counts; exits 1 on any failure.
 * `404.html` is explicitly excluded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const distDir = path.resolve(process.argv[2] || path.join(ROOT, 'client', 'dist'));
const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'recipes.json'), 'utf8'));

let failures = 0;
let warnings = 0;
const counts = { pass: 0, fail: 0, warn: 0 };

function ok(label) {
  counts.pass++;
  console.log(`  PASS  ${label}`);
}
function fail(label, detail) {
  counts.fail++;
  failures++;
  console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}
function warn(label, detail) {
  counts.warn++;
  warnings++;
  console.log(`  WARN  ${label}${detail ? ' — ' + detail : ''}`);
}

// ---------------------------------------------------------------------------
// Resolve each expected route to an actual HTML file in dist.
// ---------------------------------------------------------------------------
const expectedRoutes = [
  { route: '/', file: 'index.html', ldRequired: false },
  { route: '/search', file: 'search/index.html', ldRequired: false },
  { route: '/about', file: 'about/index.html', ldRequired: false },
  { route: '/disclaimer', file: 'disclaimer/index.html', ldRequired: false },
  { route: '/blog', file: 'blog/index.html', ldRequired: true },
  ...store.recipes.map((r) => ({ route: `/recipes/${r.slug}/`, file: `recipes/${r.slug}/index.html`, ldRequired: true })),
  ...store.nutrients.map((n) => ({ route: `/nutrients/${n.slug || n.key}/`, file: `nutrients/${n.slug || n.key}/index.html`, ldRequired: true })),
  ...store.guides.map((g) => ({ route: `/guides/${g.slug}/`, file: `guides/${g.slug}/index.html`, ldRequired: true })),
  ...(store.posts || []).map((p) => ({ route: `/blog/${p.slug}/`, file: `blog/${p.slug}/index.html`, ldRequired: true })),
];

function resolveHtml(file) {
  // vite-ssg nested output:  recipes/slug/index.html
  const nested = path.join(distDir, file);
  if (fs.existsSync(nested)) return nested;
  // flat output:             recipes/slug.html
  const flat = nested.replace(/\/index\.html$/, '.html');
  if (fs.existsSync(flat)) return flat;
  // bare index
  if (file === 'index.html' && fs.existsSync(nested)) return nested;
  return null;
}

console.log(`checking dist: ${distDir}\n`);

if (!fs.existsSync(distDir)) {
  fail('dist dir exists', distDir + ' not found — build the client first');
} else {
  ok('dist dir exists');
}

let pagesChecked = 0;
for (const { route, file, ldRequired } of expectedRoutes) {
  const htmlPath = distDir && resolveHtml(file);
  if (!htmlPath) {
    fail(`page exists: ${route}`, `missing ${file} (or flat equivalent)`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  pagesChecked++;

  // (a) <h1>
  if (/<h1[\s>]/.test(html)) ok(`<h1> present: ${route}`);
  else fail(`<h1> present: ${route}`, 'no <h1 found');

  // (b) JSON-LD
  const hasLd = /<script[^>]*type="application\/ld\+json"/.test(html);
  if (hasLd) ok(`JSON-LD present: ${route}`);
  else if (ldRequired) fail(`JSON-LD present: ${route}`, 'required on this page type');
  else warn(`JSON-LD present: ${route}`, 'recommended even here');

  // (c) no hash routes
  if (/(href|to)=["']#\//.test(html)) fail(`no hash routes: ${route}`, 'found #/ link');
  else ok(`no hash routes: ${route}`);

  // (d) no onClick-navigation heuristic
  if (/onClick/i.test(html) && /navigate\s*\(/.test(html)) {
    fail(`real <a> navigation: ${route}`, 'found onClick + navigate( pattern');
  } else {
    ok(`real <a> navigation: ${route}`);
  }
}

console.log(`\nchecked ${pagesChecked}/${expectedRoutes.length} pages`);

// (e) SEO assets in dist
for (const asset of ['sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt']) {
  if (fs.existsSync(path.join(distDir, asset))) ok(`dist asset: ${asset}`);
  else fail(`dist asset: ${asset}`, 'missing');
}

console.log(`\nRESULT: ${counts.pass} pass, ${counts.fail} fail, ${counts.warn} warn`);
process.exit(failures > 0 ? 1 : 0);
