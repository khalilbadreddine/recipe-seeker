# The Recipe Seeker — Build README (v1, for validation)

> Nutrition-first recipe site: **"Find recipes by what your body needs."**
> Owner: Khalil (solo dev, zero budget) · Existing asset: 11k-follower Pinterest account (food niche)
> Stack: React (Vite, **prerendered**) + Node/Express + SQLite
>
> **Status: PLAN — nothing is built yet. Read, validate, then we start Phase 1.**

This README is based on a dedicated deep-research pass (Sept 2026, 40 sources, mostly 2025–2026) covering
technical SEO for React, recipe rich results, AI-search visibility (GEO), YMYL nutrition content rules,
zero-budget backlink strategy, and realistic timelines. The full research report is available on request.

---

## The 5 decisions that matter most

1. **No client-side-only React.** Every indexable page is prerendered to static HTML at build time
   (vite-ssg). Googlebot renders JS slowly (render queue, crawl-budget cost), and AI crawlers
   (ChatGPT, Perplexity, Claude) render JS poorly or not at all — a CSR site would rank in classic
   search but be **invisible inside AI answers**.
2. **Full Recipe schema on every recipe page**, with real per-serving nutrition from USDA FoodData
   Central. This is the differentiator vs. generic food blogs.
3. **Built for AI citation, not just ranking**: direct-answer ledes, question H2s, nutrient tables,
   FAQ sections, sourced claims, llms.txt, AI-crawler-friendly robots.txt.
4. **Pinterest is the day-one traffic engine** (your 11k followers), not Google. Google is months 3–12.
5. **YMYL honesty**: nutrition is health content. Named author + credentialed reviewer + medical
   disclaimer — or we don't publish deficiency/health-claim content. (See §7, open question #1.)

---

## 1. What we're building (MVP)

- **Landing page** (as designed): hero, nutrient search chips, recipe cards with nutrient badges,
  how-it-works, email capture
- **Recipe detail pages** (as designed): nutrient badges, prep/cook/calorie stats, ingredient
  checklist, numbered steps, full nutrition table with % Daily Value, FAQs, related recipes
- **Nutrient hub pages** — `/nutrients/iron/` etc.: what the nutrient does, daily needs,
  deficiency signs (careful framing), top food sources table, recipe collection
- **Goal/guide pages** — `/guides/what-to-eat-for-iron-deficiency/` etc.: latent-intent queries
  that trigger AI Overviews
- **Search/filter by nutrient** (e.g. iron ≥ 5mg per serving)
- **Email capture** → SQLite (newsletter comes later)
- App-only views (saved recipes, meal planner) ship as `noindex` when they arrive — they don't
  need to rank

---

## 2. Stack (final)

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind, **prerendered with vite-ssg**, served via CDN (Cloudflare free tier) |
| Backend | Node/Express API as the data layer (frontend fetches data at build time for prerendering) |
| Database | SQLite (email signups + build-time USDA cache) |
| Nutrition data | USDA FoodData Central API (free key, 1,000 req/hr) for values; NIH Office of Dietary Supplements for daily values |
| Hosting | Frontend: Vercel or Cloudflare Pages (free) · API: Render free tier |

**What changed vs. the first plan:** the original plan said plain Vite SPA. Research killed that —
prerendering keeps your chosen stack (no framework migration) while delivering crawler-visible HTML
for both Googlebot and AI crawlers, plus working social-share previews (scrapers don't run JS either).

---

## 3. SEO architecture (from day one)

### 3.1 Technical SEO

- Prerendered HTML for **all** indexable routes — verified with `curl` (an `<h1>` must exist in page source)
- Per-route `<title>` (~50–60 chars, keyword-first, e.g. `High-Iron Lentil Soup (6mg Iron) | The Recipe Seeker`),
  meta descriptions (150–160 chars, with the nutrient hook), self-referencing canonicals,
  Open Graph / Twitter cards with absolute `og:image` URLs (1200×630)
- Build-time `sitemap.xml` (recipes + hubs, with `<lastmod>`), submitted to Search Console + Bing Webmaster;
  referenced in robots.txt
- Clean URLs: `/recipes/high-iron-lentil-soup/`, `/nutrients/iron/`, `/guides/what-to-eat-for-iron-deficiency/`
  — kebab-case, no IDs, no dates, no hash routes (`BrowserRouter`, real paths + server fallback)
- Images: AVIF primary + WebP fallback (`<picture>`), responsive `srcset`, explicit dimensions,
  hero image **preloaded, never lazy-loaded**; lazy-load below the fold only
- Core Web Vitals targets (75th percentile field data): LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
  (INP replaced FID in 2024 — no FID references anywhere)
- JSON-LD structured data embedded in the **prerendered HTML**, not injected after hydration
- Canonical policy: filter/query-param URLs (`?sort=`, `?page=`) canonicalized; one trailing-slash rule,
  enforced in Express + build
- Internal links as real `<a href>` (never `onClick` handlers) — crawlers must discover every page
- CI gates: Lighthouse on the prerendered build; budgets (JS ≤ ~200KB gzipped/route, page ≤ 1MB,
  Lighthouse perf ≥ 90); `web-vitals` RUM endpoint for real-user data

### 3.2 Recipe schema (rich results)

Recipe rich results are still viable in 2026. Queries containing "recipe" trigger the classic recipe
cards; latent-intent queries ("high iron dinners") increasingly trigger AI Overviews — we win both.

**Required** (Google): `image` (crawlable, depicts the dish, ≥ 50,000 px, provide 16:9 + 4:3 + 1:1)
+ `name`.

**Recommended — we include all of it:** `description`, `author`, `datePublished`/`dateModified`,
`prepTime`/`cookTime`/`totalTime` (ISO 8601, e.g. `PT20M`), `recipeYield`, `recipeCategory`,
`recipeCuisine`, `keywords`, `recipeIngredient[]`, `recipeInstructions[]` as `HowToStep` objects
(per-step anchors + images; `HowToSection` for multi-part recipes), full `nutrition{}` per serving
(calories, protein, fiber, iron… from USDA — **our differentiator**), `suitableForDiet`
(VeganDiet, GlutenFreeDiet…), `video` (VideoObject) when we have it.

Plus: `ItemList` carousels on hub/collection pages (pointing at real collection pages),
`BreadcrumbList` on all pages, `FAQPage` schema on recipe/guide pages (8–12 genuine Q&As —
Google restricted the visual FAQ rich result, but the markup still feeds AI citation).

**Ratings rule:** recipe review snippets ARE allowed (the "self-serving" ban is for LocalBusiness,
not recipes) — but ratings must be real, visible on the page, with written reviews and genuine
names. **We ship a real rating widget and NO fabricated `aggregateRating`.** Fake ratings =
spammy markup = loss of rich results. (Tooling note: validators and even Rich Results Test may flag
missing *recommended* fields like `datePublished` or `description` as "issues" even though Google's
hard requirements are only `image` + `name`. We're including the full recommended set anyway —
treat those warnings as a checklist, not a verdict.)

### 3.3 AI SEO / GEO (the "new SEO")

Google's official line: no special AI optimization needed — eligibility for AI Overviews = indexed +
snippet-eligible + normal technical SEO. So most of §3.1 *is* the AI strategy. On top:

- **robots.txt explicitly allows AI crawlers:** GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot,
  Google-Extended, CCBot — and we verify Cloudflare bot rules aren't silently blocking them.
  (Note: allowing Google-Extended only affects AI *training*, not AI Overviews appearance.)
- **`/llms.txt` + `/llms-full.txt`** generated at build time (Markdown index of the site's content).
  Status: community proposal, not a standard; Google says Search ignores it. We publish it anyway —
  ~1 hour of work, near-zero risk, possible comprehension aid. Cheap insurance, not a strategy.
- **Content template engineered for citation:** direct-answer lede in the first ~100 words
  (*"This lentil soup delivers 6.2mg iron per serving — 34% of the daily value…"*), H2s phrased as
  real questions, nutrient data in tables, ingredients/steps in lists, FAQ sections, every nutrient
  claim traceable to USDA with an inline source link, named author with bio page, visible
  publish/modified dates.
- **One original data study per quarter** (e.g. *"we analyzed the iron content of 200 popular lentil
  recipes"*) — the highest-ROI asset for both backlinks and AI citations, because models need
  numbers with sources.
- **Honest accounting:** no universal citation formula exists across ChatGPT/Claude/Gemini/
  Perplexity/AI Overviews. Precise "citation lift" stats circulating online have no published
  methodology — treat as marketing. What we do is directionally proven; we measure and adapt.

### 3.4 Content strategy + YMYL (non-negotiable for nutrition)

Nutrition content is **Your Money or Your Life** (health) — Google's quality bar applies to AI
surfaces too.

- **Programmatic templates** (the concept *is* the template: Nutrient × Goal × Diet × Meal):
  `/nutrients/{iron,b12,vitamin-d,…}/`, `/goals/high-{nutrient}-meals/`,
  `/guides/what-to-eat-for-{deficiency}/`, `/recipes/{slug}/`, diet cross-cuts.
  Template ≠ thin: every page gets unique intro copy, data tables, curated picks with editorial
  notes, FAQs, internal links. Thin auto-generated pages fail helpful-content evaluation.
- **Keyword research, zero budget:** Google Keyword Planner (free), autocomplete + People Also Ask,
  Pinterest guided search (your niche — doubles as content validation), GSC impression data from
  week 1. Target low-competition long-tails first: *"[nutrient] in [dish]"*, *"how much [nutrient]
  in [food]"*, *"[deficiency] what to eat"*.
- **Internal linking:** hub-and-spoke (nutrient hub ↔ goal pages ↔ recipes), breadcrumbs,
  ≤ 3 clicks from homepage, no orphan pages (sitemap and internal links must agree).
- **E-E-A-T:** named author with verifiable bio, credentialed reviewer line
  (*"Reviewed by [RD], [credentials]"* — see §7), About / methodology / contact pages, medical
  disclaimer on **every** nutrition page + dedicated disclaimer page, no disease-treatment claims
  (*never* "cures anemia"), deficiency content always says "talk to your doctor / get tested".
- **Seed content:** 12 recipes at launch, all nutrition values USDA-backed, every template validated
  in Google's Rich Results Test before bulk publishing.

---

## 4. Backlink & traffic plan (zero budget)

**Tier 1 — from week 1:**
- **Pinterest (the unfair advantage):** every recipe/guide pinned with keyword-rich titles/descriptions,
  boards organized by nutrient/goal, every pin → post URL with UTM params. Pinterest links are
  **nofollow** (no direct ranking authority) — but pins are Google-indexed, drive large relevant
  referral traffic, and live for months/years. This is the main traffic source for months 1–3.
- **Journalist requests:** Connectively (ex-HARO), Qwoted, Featured — answer 2–3×/week as a
  nutrition-recipe source. Food/health journalists constantly need expert quotes; the credentialed
  reviewer (§7) makes pitches land.
- **Resource-page + broken-link outreach:** pitch nutrient hubs to `"healthy recipes" resource` pages
  and `.edu` healthy-eating pages; use Check My Links (free) to find broken links to replace.
- **Community:** Reddit (r/nutrition, r/EatCheapAndHealthy, r/recipes — read self-promo rules first),
  Quora — genuine answers, link only when it directly answers the question. Nofollow, but drives
  traffic, brand searches, and AI-answer pickup.

**Tier 2 — weeks 4–12:**
- **Guest posts** on relevant food/nutrition blogs: 20–40 personalized pitches/week, specific angles,
  contextual in-content links.
- **Expert roundups** (*"12 dietitians on the easiest high-iron meals"*) — contributors link back and share.
- **Podcast guesting** on small nutrition/wellness shows → show-notes links.
- **Data study #1** by day 60 (see §3.3).

**Realistic pace:** ~10–30 quality referring domains per 90 days; compounding typically starts day 60–90.
**Never:** bulk link packages, PBNs/link farms, link bursts, repeated exact-match anchors, paid links
without `rel="sponsored"`, "free backlink list" directories.

---

## 5. Measurement (free tools) & realistic expectations

**Day-one stack:** Google Search Console, Bing Webmaster Tools, Rich Results Test, validator.schema.org,
PageSpeed Insights, **OpenLens** (free AI-visibility tracker — brand mentions across ChatGPT, Claude,
Google AI, Perplexity; free tier = 1,000 credits/month, direct chat-interface tracking covers ChatGPT /
Perplexity / Google AI while Claude / DeepSeek use API-based sampling — plan prompt checks accordingly), plus manual monthly prompt checks ("does ChatGPT cite us for X?").

**KPIs:** % of sitemap URLs indexed · impressions / # of queries / avg position · clicks + CTR by page
type · Pinterest referral sessions (UTM) · AI citation count · referring domains.

**Honest timeline (new domain, YMYL-adjacent niche):**
- **Days 0–30:** indexed; single-digit impressions; ~zero clicks. Normal, not failure.
- **Days 30–90:** impressions climb; first long-tail clicks (*"how much iron in red lentils"*);
  Pinterest becomes the primary traffic source. Publish consistently — each post is a lottery ticket.
- **Days 90–180:** long-tail rankings stabilize; first AI Overview citations on niche questions;
  10–30 referring domains if outreach was consistent.
- **6–12+ months:** competitive nutrition terms become winnable. Median age of top-ranking pages is
  2–3+ years — we're building toward that. Health/nutrition is competitive; expect the long end.
- "Indexed but not ranking" in months 1–3 is trust-building, not a penalty.

---

## 6. Build phases

- **Phase 0 — validation (now):** you read this README, approve or change it. Nothing gets built first.
- **Phase 1 — foundation:** repo scaffold (`client/` + `server/`), design system from the mockups,
  vite-ssg prerender pipeline, Express API + SQLite, USDA integration with build-time caching,
  robots.txt / sitemap / llms.txt generators, CI performance budgets.
- **Phase 2 — pages:** landing, recipe template (full schema + nutrition), nutrient hub template,
  guide template, nutrient search/filter, email capture, FAQ blocks, rating widget.
- **Phase 3 — seed content:** 12 recipes with real USDA-backed nutrition + 4–6 hub/guide pages,
  all validated in Rich Results Test.
- **Phase 4 — launch checklist:** GSC + Bing verification, sitemaps submitted, OpenLens baseline,
  Pinterest pipeline live, budgets green.
- **Phase 5 — growth loop:** 30-pin validation sprint (outbound-click lift vs. current baseline),
  outreach cadence, data study #1.

---

## 7. What I need from you (validate these)

1. **Author identity (biggest open question):** nutrition content needs a named author and ideally a
   credentialed reviewer (registered dietitian). Options: (a) you publish as recipe developer and we
   add a *"reviewed by"* line later; (b) you know someone with credentials we can credit; (c) we keep
   health claims minimal until (a)/(b). Without this we limit deficiency/health content.
2. **Domain:** buy a fresh domain (e.g. therecipeseeker.com) or start on your existing
   therecipeseeker.systeme.io? Fresh domain = clean SEO slate; subdomain = faster start.
3. **USDA API key:** free 2-minute signup at fdc.nal.usda.gov/api-key-signup — needed before Phase 3.
4. **Pinterest profile link:** to wire CTAs and UTM structure.
5. **Recipe photos:** AI-generated in a consistent style, or stock photos for seed content?
6. **Approve the stack + prerender decision** (React/Vite + vite-ssg + Express + SQLite), or tell me
   what to change.

---

## Sources

Full research report (6 sections, ~40 sources, Sept 2026) available on request. Key references:
Google Search Central recipe structured-data docs · Google AI Overviews guidance (2026) ·
Search Engine Journal (llms.txt status, recipe-intent keywords) · Backlinko link-building guide (2026) ·
USDA FoodData Central API docs · OpenLens (free AI-visibility tracker).

---
*README v1 — 2026-09-17. Phase 1 (foundation) + Phase 2 (pages) built and verified 2026-09-17.*

---

## Run & deploy

Prerequisites: **Node 20+** (built/tested on Node 24). All dependencies are free/open-source.
No secrets are committed — copy `.env.example` to `server/.env` for local overrides.

### Local development

```bash
# 1. Install dependencies
npm --prefix server install
npm --prefix client install

# 2. Build the dataset (validates seed data, writes data/recipes.json + client copy)
npm run data:build

# 3. Terminal A — API on http://localhost:3001
npm run server:dev

# 4. Terminal B — frontend dev server on http://localhost:5173 (proxies /api → :3001)
npm --prefix client run dev
```

### Production build + verification

```bash
npm run build        # data:build → seo:build → client build (prerenders every route to static HTML)
npm run seo:check    # 122 automated checks: <h1> in every page, JSON-LD present,
                     # no hash routes, real <a> navigation, sitemap.xml / robots.txt /
                     # llms.txt / llms-full.txt present in dist/
npm --prefix client run preview   # serve client/dist/ locally to smoke-test
```

How the build works: `vite build` → SSR bundle (`entry-server.jsx`) → `node scripts/prerender.mjs`
renders every route (from `src/data/recipes.json`, the same file the pages read) to
`dist/<route>/index.html`, injecting react-helmet-async head tags and JSON-LD, and emits
`sitemap.xml`, `robots.txt` (AI crawlers explicitly allowed), `llms.txt`, `llms-full.txt`.
(vite-ssg's React support was dropped in v24+, so the prerenderer is custom — same outcome.)

### Deploy (all free tiers)

**Recommended — single service (simplest, zero CORS):** deploy `server/` to the Render free tier.
If `client/dist/` exists, Express serves the prerendered site itself, so one service handles
both frontend and API.

```bash
# Render settings for the Web Service:
#   Build command: npm run build && npm --prefix server install
#   Start command:  npm run server:start
#   Env vars:       FDC_API_KEY=<your key>   (optional until Phase 3 refresh; DEMO_KEY is the default)
```

**Split (alternative):** frontend `client/dist/` → Cloudflare Pages or Vercel (static, `404.html`
as the not-found page); API → Render. Note: the client calls `/api/*` relatively, so a split
deploy needs either same-origin rewrites or a `VITE_API_URL` base — single-service is easier.

### USDA data refresh (when the production key arrives)

All 12 seed recipes are currently marked `source: "estimate-refresh-when-key-arrives"` — values
were composed from documented USDA per-100g figures, not live API pulls. To flip them to
`cached-verified`:

```bash
# 1. Get a free key: https://fdc.nal.usda.gov/api-key-signup (2 min, 1,000 req/hr)
# 2. Put it in server/.env as FDC_API_KEY=...
node scripts/fetch-hero-cache.cjs   # 12 ingredient pulls → SQLite cache (stays under DEMO limits)
# 3. Recompute per-serving nutrition from cache, update data/seed.mjs sources, then:
npm run build && npm run seo:check
```

### What's still open (needs Khalil)

1. **Author identity — DONE in v2.** The site now ships with "Emily Carter, recipe developer &
   nutrition enthusiast" (AI persona with a low-iron backstory, portrait at
   `client/public/images/author.webp`, bylines on recipe/guide pages, Person JSON-LD on /about).
   Hard honesty rule enforced: she is NEVER presented as a dietitian/doctor. If you later want a
   real credentialed reviewer, add a "Reviewed by" line then.
2. **Domain** — canonical base is the placeholder `https://therecipeseeker.com`; update
   `SITE_URL` in `client/src/data/site.js` + rebuild when the real domain is live.
3. **USDA API key** — your production key is already in the gitignored `server/.env` (do not
   commit it). The hero-ingredient cache now covers all 24 recipes (22 cached pulls in
   `server/data/app.db`). Per-serving values in v2 are still authored estimates backed by
   USDA hero-ingredient data (`source: 'estimate-refresh-when-key-arrives'`); a full per-recipe
   recompute from weighed ingredients is future work.
4. **Pinterest profile link** — to wire CTAs/UTMs.
5. **Recipe photos — DONE in v2.** All 24 recipes now have their own AI-generated food photo in
   `client/public/images/` (warm editorial style, cream backgrounds). Replace with real
   photography any time.
6. **Newsletter backend** — the signup form posts to `/api/subscribe` (Express + SQLite), which
   does not exist on static hosting (Vercel/Cloudflare Pages). You said you will handle this
   later: either deploy the Express server (Render, single-service) or swap the form to a
   provider (Buttondown/ConvertKit) + serverless function.
7. **Plausible account** — create it, add the real domain, confirm `data-domain` in
   `client/index.html`.
8. **Contact email** — replace placeholder `hello@therecipeseeker.com` in `ContactPage.jsx` and
   `PrivacyPage.jsx` with the real inbox.

---

## v2 notes (2026-09-17)

1. **Plausible analytics is installed** (`<script defer data-domain="therecipeseeker.com" src="https://plausible.io/js/script.js">`
   in `client/index.html`). It's privacy-friendly (no cookies, no personal data) so no cookie banner
   is needed — and the [Privacy Policy](/privacy) says so. But `therecipeseeker.com` is a placeholder:
   the owner must create a Plausible account, add the real production domain, and confirm the
   `data-domain` attribute matches exactly (or stats will silently land nowhere).
2. **Contact form is mailto-only in v2.** `client/src/pages/ContactPage.jsx` opens the visitor's
   email app with the message pre-filled — no backend, nothing stored. It can be wired to
   Formspree (or the SQLite/newsletter backend) later.
3. **`hello@therecipeseeker.com` is a placeholder** contact email. Replace with the real inbox in
   `ContactPage.jsx` and `PrivacyPage.jsx` before launch.
4. **Lead magnet PDF (ungated in v2).** "Free 7-Day High-Protein Meal Plan" lives at
   `client/public/downloads/7-day-high-protein-meal-plan.pdf` (3 pages, brand colors, protein
   numbers taken from the recipe data). It is ungated in v2: the homepage CTA
   (`client/src/components/LeadMagnetCta.jsx`, wired into `Home.jsx`) links straight
   to the PDF. Add the email gate / newsletter capture for the download later (v3+), once the
   newsletter backend is settled.
5. **Taste-skill redesign pass applied** (2026-09-17): audit-first redesign-preserve over all
   pages/components — em/en-dash purge from all user-visible copy (seed data + JSX; legal pages
   intentionally untouched), eyebrow restraint, hero discipline, 3-equal-cards removed,
   duplicate CTA intents unified ("Search Recipes"), button/form contrast to WCAG AA
   (white-text CTAs now `ember-dark`), print stylesheet preserved, Section-14 pre-flight
   checklist passed with documented exceptions (legal copy locked, light-only brand,
   brand-mandated serif kept).
6. **v2 build is green:** `npm run build` clean, `npm run seo:check` = **171 pass, 0 fail, 2 warn**
   (warnings are only "JSON-LD recommended" on /search and /disclaimer, same as v1).
