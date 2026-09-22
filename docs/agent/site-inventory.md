# Recipe Seeker — Site Inventory (first-run discovery)

Date: 2026-09-22 · SOP: Website Growth Manager · Agent first-run discovery
Live site: https://recipe-seeker-client.vercel.app/ · Repo: khalilbadreddine/recipe-seeker (main)
Scope of this doc: read-only inspection of the repository. No production content, code, or config was modified to produce it.

---

## 1. Framework, runtime, package manager, build & test commands

- **Framework:** React 19.3 + React Router 7 (SPA) with a **custom static site generator** — every indexable route is prerendered to static HTML at build time by `client/scripts/prerender.mjs` (Vite SSR bundle + `react-dom/server` + `react-helmet-async`). No Next.js, no vite-ssg (their React support was dropped).
- **Runtime / language:** Node.js 20 (GitHub Actions uses `setup-node@v4` with `node-version: '20'`).
- **Package manager:** npm, with npm workspaces (`client` is a workspace of the root package).
- **CSS:** Tailwind CSS v4 via `@tailwindcss/vite`. Design tokens live in `client/src/index.css` `@theme` block.
- **Build (root, used by Vercel):** `npm run build` =
  1. `node scripts/resolve-nutrition.mjs` — resolves/verifies nutrition data (USDA-backed cache)
  2. `node scripts/generate-seo.mjs` — (now a stub; verifies data builds and defers to prerenderer)
  3. `npm --prefix client run build` = `vite build && vite build --ssr src/entry-server.jsx --outDir dist-ssr && node scripts/prerender.mjs`
- **SEO smoke test:** `npm run seo:check` → `node scripts/check-seo.mjs client/dist`. Asserts per prerendered route: an `<h1>` exists; a JSON-LD script exists (required on recipe/nutrient/guide/blog pages, warn-only elsewhere); no `#/` hash links; internal navigation uses real `<a href>`; and that `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` were emitted.
- **Lint/typecheck/unit tests:** none configured. There is no `lint`, `typecheck`, or `test` script in either `package.json`. Quality gates are: the nutrition resolver, the build itself, and `seo:check`.
- **Image processing:** `sharp ^0.35.4` at root (used for hero-image variants).

## 2. Content model

Content is **file-based JSON**, single source of truth = `client/src/data/recipes.json` (read via `client/src/data/site.js`).

| Content type | Storage | Count (2026-09-22) | Route pattern |
|---|---|---|---|
| Recipes | `client/src/data/recipes.json` → `data.recipes` | 50 | `/recipes/:slug` |
| Blog posts | same file → `data.posts` (kept in sync with root `data/posts.json`, the pipeline input; both hold the same 5 slugs) | 5 | `/blog/:slug` |
| Nutrient hubs | same file → `data.nutrients` | 12 | `/nutrients/:slug` |
| Guides | same file → `data.guides` | 2 | `/guides/:slug` |
| Site config / canonical base | same file → `data.site` (`name`, `tagline`, `canonicalBase`) | — | — |
| Author persona | `client/src/data/author.js` (`AUTHOR`, `AUTHOR_PERSON_LD`) | 1 persona | `/about` |

- **Recipe fields:** `slug, title, description, image, imageAlt, prepTime/cookTime/totalTime` (ISO 8601 + minute integers), `servings, calories, nutrition` (per-nutrient `{amount, unit, dv}` for protein/fat/carbs/fiber/sugar/sodium/iron/calcium/vitaminC/potassium/omega3…), `keyNutrients, ingredients` (grouped), `steps, tags, faqs, whyItHelps, source, datePublished, dateModified`.
- **Blog post fields:** `slug, title, description, lede, category, image, sections, faqs, relatedRecipes, datePublished, dateModified`.
- **User data (NOT in the JSON):** Supabase Postgres — tables `public.favorites` and `public.day_plans` (RLS enabled). Client auth via `@supabase/supabase-js` + Google OAuth; favorites/day-builder sync to the cloud when signed in, localStorage fallback otherwise.
- **Express/SQLite API (`server/`):** exists in the repo but is **not deployed** — the Vercel deployment serves static files only and `vercel.json` defines no serverless functions or `/api` rewrites. Consequence: `NewsletterSignup.jsx` POSTs to `/api/subscribe`, which has no backend on the live site (see §9 risk).
- **Content pipeline (GitHub, not in the live bundle):** `pipeline/scripts/` — `draft-generator.mjs` (AI draft writer, capped `DRAFTS_PER_DAY`), `publisher.mjs` (publishes Supabase drafts with status `approved` into `client/src/data/recipes.json` + git push), `keyword-miner.mjs` (Pinterest API — **trial approval pending**), `keyword-miner-news.mjs` (Google News RSS, no key needed), `pin-scheduler.mjs`.
- **Audience/geography/language:** US-oriented, English (`<html lang="en">`). Site content and Pinterest audience are US-centric; no i18n.
- **Brand voice (stated):** practical, clear, helpful, accurate, appetizing, non-generic. YMYL guardrails are codified: author persona "Emily Carter" is explicitly a *"recipe developer & nutrition enthusiast"* — never a dietitian/doctor (see `author.js` honesty rule); a `MedicalDisclaimer` component exists.

## 3. Routes, sitemap, robots.txt, canonicals, redirects, images, metadata

**Routes** (`client/src/App.jsx`; prerendered set in `client/scripts/prerender.mjs`):
`/` · `/recipes` · `/recipes/:slug` · `/nutrients` · `/nutrients/:slug` · `/guides/:slug` · `/blog` · `/blog/:slug` · `/search` (tool page) · `/day-builder` · `/saved` · `/fibermax-reset` (Lemon Squeezy product page) · `/about` · `/disclaimer` · `/privacy` · `/contact` · `/admin/review` · `/admin/dashboard` (owner-gated) · `*` → NotFound → static `404.html`.

**Sitemap / robots / llms.txt:** NOT in `client/public/`; they are **generated at build time by the prerenderer** into `client/dist/` from the same data file the pages render (sitemap and HTML cannot disagree). `sitemap.xml` excludes only `/search`. `robots.txt` allows all crawlers explicitly including AI bots (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot) and declares the sitemap. `llms.txt` / `llms-full.txt` are also emitted (AI-discovery friendly).

**Canonical behavior:** `site.canonicalBase` (`https://recipe-seeker-client.vercel.app`) → `SITE_URL`; every page renders `<link rel="canonical" href={absUrl(path)}>` plus matching OG/Twitter tags via the shared `Seo.jsx` component (react-helmet-async, SSR-injected so crawlers see them in static HTML). Note: `site.js` carries a TODO — *"replace with the real production domain once DNS is live"* (custom domain `therecipeseeker.com` planned, not yet purchased/connected).

**Redirects:** none defined. `vercel.json` has a single **rewrite** (not redirect): `/admin/:path*` → `/index.html` so the gated admin SPA routes load. `trailingSlash: false`.

**Image handling:** `client/public/images/` — 221 files, ~38 MB. Recipe heroes are `.webp` with responsive variants `-480w/-800w/-1200w` served via `ResponsiveImage.jsx` (srcset). Convention: `/images/<slug>.webp` + `imageAlt` from data. 55 recipe images were optimized (WebP, multi-width). Long-cache headers (`immutable`, 1 yr) on `/images/*` and `/assets/*` in `vercel.json`. Hero images are AI-generated by the agent (cap ~2/day, brand style) or free-license stock modified — never hotlinked copyrighted images. A 7-day meal-plan PDF lives at `client/public/downloads/7-day-high-protein-meal-plan.pdf`.

**Metadata templates:** `Seo.jsx` (title, description, canonical, OG, Twitter, optional `article:published_time`/`modified_time`, optional `noindex`). `noindex` is applied to: `/search`, not-found fallbacks (recipe/guide/post/nutrient "not found" shells), 404, and both `/admin/*` pages.

## 4. Recipe page fields (as rendered, `RecipePage.jsx`)

Title (H1) · short description · hero image + `imageAlt` · nutrient badges ("38g protein") · prep/cook/total time · servings · calories · full `NutritionTable` (amount + %DV per nutrient) · grouped ingredients with prep notes · numbered steps · `whyItHelps` bullets · FAQs (accordion) · `relatedRecipes` internal links · author byline · star `RatingWidget` (real, localStorage-persisted per user — **no fabricated `aggregateRating`** in schema) · print button · save-to-favorites (Supabase/localStorage). Fields are all present on all 50 recipes: 0 missing descriptions, 0 missing dates, 0 duplicate slugs/titles, 0 broken `relatedRecipes` links, 0 missing hero-image files (all with responsive variants).

## 5. Structured data (`JsonLd.jsx` + per-page schemas)

Coverage is broad and matches visible content: `Recipe` (with `HowToStep`, `NutritionInformation`, no fake ratings) · `Blog`/`BlogPosting` · `Article` (guides) · `BreadcrumbList` (every content page) · `Organization` + `WebSite` (+`SearchAction` on Home) · `ItemList`/`CollectionPage` (indexes, nutrient hubs) · `FAQPage` (recipe/guide/blog/nutrient FAQs) · `Product`+`Offer`+`Brand` (Fibermax page). Author schema uses `Person` "Emily Carter", role *"Recipe developer & nutrition enthusiast"* (no credential claims — YMYL-safe). `seo:check` asserts JSON-LD presence on every prerendered content route.

## 6. Analytics integrations

**Effectively none implemented in code:**
- **GA4:** not present (no `gtag`/`googletagmanager`).
- **Google Search Console:** no verification meta in `index.html`; ownership status unknown (needs owner check).
- **Vercel Analytics / Speed Insights:** not installed (no `@vercel/analytics`).
- **Pinterest Tag:** not installed. Only a Pinterest **domain-verification** meta (`p:domain_verify`) in `index.html` — site is claimed on Pinterest, no conversion tracking.
- **Cookies/consent:** none — no tracking cookies, no consent banner. BUT the Privacy page states *"our analytics works without them"* — **no cookieless analytics implementation was found in the repo either**, so that sentence currently describes nothing. (See §9: fix or remove.)
- Net: the site is blind to traffic beyond Pinterest's own analytics (owner's Pinterest account, 11k followers / ~66k monthly views) and Vercel's built-in deployment logs.

## 7. Design system & safest way to attach images / Pinterest assets

- **Tokens** (`client/src/index.css` `@theme`): forest `#1e4633` (+ dark/deep/soft/line), cream `#faf5e9` (+ dark/card), ember `#e4572e` (+ dark/soft); fonts **Fraunces** (display serif) + **Inter** (sans) via Google Fonts.
- **Components:** shared UI in `client/src/components/` (`Seo`, `JsonLd`, `RecipeCard`, `NutrientBadge`, `Breadcrumbs`, `FaqAccordion`, `NutritionTable`, `ResponsiveImage`, `LeadMagnetCta`, `MedicalDisclaimer`, …). New admin UI kit at `client/src/pages/admin/ui.jsx`.
- **Safest image workflow:** generate/modify → save as `client/public/images/<slug>.webp` + `-480w/-800w/-1200w` variants (sharp is available) → set `image` + `imageAlt` in data → `seo:check` + build verify. Rights rule: AI-generated or free-license-modified only; never hotlink.
- **Pinterest assets:** Pinterest is **manual-only** — the agent prepares packages, the owner posts. The 13-day pin kit (52 pins, PDF) lives at `~/workspace/your_files/pinterest-13-day-pin-kit/`. Pin spec per SOP: 1000×1500 (2:3), brand fonts/colors, food-forward licensed/AI image, natural-language title/description, exact canonical destination URL.

## 8. CI/CD & Vercel deployment workflow

- **Vercel:** auto-deploys on push to `main`. `vercel.json`: `buildCommand: npm run build`, `outputDirectory: client/dist`, security headers (CSP, `X-Frame-Options: DENY`, etc.), long-cache on images/assets. No env-dependent build steps observed.
- **GitHub Actions:**
  - `pipeline-publish.yml` — daily 06:00 UTC: runs `publisher.mjs`; if `recipes.json` changed, commits + pushes → Vercel auto-deploys.
  - `keyword-news-weekly.yml` — Sundays 06:00 UTC: Google News RSS keyword mining → Supabase `keyword_candidates`.
- **Known operational issue (from owner context, not re-verified here):** the stored Vercel API token is read-only (403 on project operations); promoting a preview deployment to production currently requires the owner's manual action in the Vercel dashboard. On 2026-09-21 three published posts 404'd because the deployment landed on a preview URL behind login instead of production — the posts were removed per owner order; republish is backed up and one command away.
- **Secrets in CI:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (GitHub Actions secrets).

## 9. Content patterns & quality findings (repo-verified)

- **Duplicates:** none — 0 duplicate recipe slugs/titles; 0 near-duplicate risk flagged by titles. (Blog posts: `data/posts.json` and `client/src/data/recipes.json` posts are in sync today, but maintaining two copies is a drift risk — single-source this.)
- **Broken links:** 0 broken `relatedRecipes` links across recipes and posts; all 50 hero images resolve on disk with responsive variants. (Live-link crawl of the deployed site was not run — no crawl access from here.)
- **Missing metadata:** 0 recipes missing description/dates/image/alt. Guides (2) have **no hero images** (render without one). Nutrient hubs have no images by design.
- **Noindex:** correct — `/search`, 404/not-found shells, `/admin/*` are noindexed; everything else indexable. **Questionable:** `/saved` and `/day-builder` are user-tool pages yet are prerendered AND included in `sitemap.xml` (only `/search` is excluded). Consider excluding `/saved` (personal state page) from the sitemap — P3.
- **Live UX gaps (code-verified):**
  - `NewsletterSignup` (used on Home) POSTs to `/api/subscribe` — **no backend exists on the static host**; submissions fail with a generic error. Either wire a provider or replace with the PDF-download CTA already used elsewhere.
  - Privacy page claims cookieless analytics exist — no analytics code found (§6). Remove or implement.
- **YMYL posture is strong:** no fabricated ratings/reviews/nutrition in schema, author persona carries no credential claims, medical disclaimer component + `/disclaimer` page exist, writer guardrails block invented personal experience.
- **What was NOT checked:** live crawl (broken outbound links, real HTTP statuses), Core Web Vitals, GSC indexing state, duplicate content vs. competitors. These need browser/crawl access or owner-connected tools.

## 10. Secrets — environment variable NAMES only (no values read or recorded)

- Repo `.env.example`: `FDC_API_KEY` (USDA FoodData Central, build-time), `PORT`.
- Pipeline/server scripts reference: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `DRAFTS_PER_DAY`, `MAX_KEYWORDS_PER_DAY`, `LLM_PROVIDER`, `NVIDIA_MODEL`, `XAI_MODEL`, `HF_TOKEN`, `POLLINATIONS_API_KEY`, `POLLINATIONS_MODEL`, `PINTEREST_ACCESS_TOKEN`, `PINTEREST_API_BASE`, `PINTEREST_BOARD_ID`, `PINTEREST_REGION`, `PINTEREST_TREND_TYPE`, `PIN_SPACING_HOURS`, `RECIPE_DATA_PATH`, `SITE_URL`, `DRY_RUN`.
- Live secret values (OpenRouter/NVIDIA keys, Supabase service key) live in gitignored `.env` files (chmod 600) — never re-asked, never printed. GitHub Actions holds `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`. Vercel project env vars were not inspected (token is read-only).

---

## Gaps this discovery could NOT close (and what resolves each)

1. **Google Search Console data** (clicks/impressions/CTR/positions) — unavailable: no evidence of GSC connection. Resolved by: owner connecting GSC (or granting access) to the property.
2. **GA4 / any traffic analytics** — none implemented. Resolved by: owner decision to add GA4 or a cookieless tool (then code change + PR).
3. **Pinterest analytics / Trends** — owner's Pinterest account only; no API access here. Resolved by: owner sharing Pinterest analytics exports or approving the Pinterest API trial (`keyword-miner.mjs` is built for it).
4. **Live crawl** (HTTP statuses, outbound broken links, real render) — no browser/crawl from this environment. Resolved by: a browser-capable run or an external crawl (Screaming Frog / Sitebulb) shared as export.
5. **Vercel project state** (env vars, deployment/promotion status) — stored token is read-only. Resolved by: owner action in the Vercel dashboard.
6. **Custom domain** (`therecipeseeker.com`) — not purchased yet per owner context; canonicals still point at the Vercel subdomain. Resolved by: owner purchasing the domain ($1 first-year offers identified) → same-day Vercel connection.
