# Kitchen-Test Gate — SUPERSEDED

> **Superseded 2026-09-28 by owner order.** The kitchen-test draft gate was
> removed: Khalil will not kitchen-test recipes, and the red "Draft recipe
> requiring kitchen testing before publication" warning scared readers away.
>
> **Current policy:** Neo researches/curates recipes from reputable sources
> (never invented), resolves nutrition from USDA FoodData Central ingredient
> data, and ships via PR — Khalil only reviews/merges. Every recipe in
> `data/seed.mjs` is published. No "untested" warnings are rendered anywhere.
> A positive **"Tested in our kitchen ✓"** badge is shown only when
> `kitchenTested: true` with documented evidence in `kitchenTest`
> (enforced by `scripts/resolve-nutrition.mjs`).
>
> The rest of this document is kept for historical context only.

---

# Kitchen-Test Gate — Recipe Publishing Policy (historical)

**Rule: an untested recipe must not become a live production recipe merely
because it displays a warning.** A warning is transparency, not a substitute
for testing.

## The gate

Every recipe in `data/seed.mjs` carries an explicit `kitchenTested` field:

| Value | Meaning |
|---|---|
| `false` | **Draft.** The recipe has not been cooked and verified. It is validated for shape/nutrition/claims but **excluded from all public artifacts** (see below). New recipes start here. |
| `true` | **Publishable.** A human cooked the recipe and documented the evidence in `kitchenTest` (required — the data build fails without it). |
| _(missing)_ | Treated as published. Applies to the 50 pre-policy recipes only. All new recipes must set the field explicitly. |

## What "draft" excludes

When `npm run data:build` runs **without** `INCLUDE_DRAFTS=true`, draft recipes
are removed from `data/recipes.json` and `client/src/data/recipes.json`, and
their slugs are stripped from nutrient-hub `recipeSlugs` and guide/post
`relatedRecipes`. Because every discovery surface derives from the client
bundle, one filter enforces all of:

- production recipe listings (`/recipes`)
- site search (`/search`)
- prerendered recipe routes (the URL 404s with a `noindex` "not found" page)
- `sitemap.xml`
- Recipe JSON-LD (no page → no structured data)
- nutrient hubs (`/nutrients/*`)
