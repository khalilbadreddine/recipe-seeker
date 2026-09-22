# Kitchen-Test Gate — Recipe Publishing Policy

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
- "You Might Also Like" related-recipe modules
- `llms.txt` / `llms-full.txt`
- Pinterest destination URLs (never publish a pin to a draft URL)

## Private preview

To review a draft recipe as a rendered page:

```bash
INCLUDE_DRAFTS=true npm run data:build
npm run build   # or: npm --prefix client run build
```

This is for **local preview only**. Never set `INCLUDE_DRAFTS=true` on a
production build or deployment.

## Enforcement (not just documentation)

The data build **refuses** `INCLUDE_DRAFTS=true` when any deployment/CI
indicator is present and exits non-zero with:

> INCLUDE_DRAFTS=true is forbidden in CI or deployed builds. Draft recipes may
> be previewed locally only.

Blocked indicators: `CI=true|1`, `VERCEL=true|1`, `VERCEL_ENV=preview`,
`VERCEL_ENV=production`, `NODE_ENV=production`.

Reproducible proof: `npm run test:draft-gate` — asserts a normal production
build excludes drafts, a local preview includes them, and each blocked
environment combination fails with the exact policy error.

## Approval evidence (`kitchenTest`)

Flipping `kitchenTested` to `true` requires a `kitchenTest` object with all of:

- `tester` — name or role of the person who cooked it
- `date` — test date (YYYY-MM-DD)
- `confirmedQuantities` — ingredient quantities verified as written
- `confirmedTimes` — prep/cook/total time verified as written
- `confirmedServings` — serving count verified as written
- `changesFromDraft` — what changed vs the draft (or `"none"`)
- `finalPhoto` — path to a photo of the real cooked dish, or a note explaining
  why no photo is available

The data build **fails** if any field is missing. After the test, update the
recipe's quantities/times/notes to match what was actually cooked, then set
`kitchenTested: true` with the evidence.

## Language rules while `kitchenTested: false`

Do not describe a draft as "ready for publication", "ready for Pinterest",
"ready for production", or any equivalent. It is a draft until the gate above
is complete.

## FAQ policy (no floors)

FAQs are **optional**. There is no minimum — a minimum pressures authors into
inventing questions (AI slop).

- 0 FAQs if the recipe is already fully clear; 2–4 is typical.
- Up to **6** only where readers genuinely need troubleshooting, substitutions,
  storage, dietary clarification, or make-ahead guidance.
- Each FAQ must answer a question **not** already clearly answered in the
  ingredients, instructions, notes, or storage guidance, and must add material
  practical value.
- Never add FAQs for SEO or schema padding.
- The data build warns (does not fail) when a recipe exceeds 6 FAQs. The 50
  pre-policy recipes carry 8–10 FAQs each; trimming them is a separate content
  decision, tracked for a future PR — not done silently here.

## Editorial exception (owner-ordered publish without a kitchen test)

An untested recipe may ship only under an explicit, recorded exception —
never silently:

```js
editorialException: {
  reason: "<why the owner ordered publication without a kitchen test>",
  date: "YYYY-MM-DD",
  approvedBy: "<owner handle>",
}
```

The data build fails if any of the three fields is missing, and warns loudly
when an exception is used. The recipe ships WITH the draft warning rendered
on its page, so readers always see the honest label. A kitchen test can
replace the exception later — it never converts to a silent publish.
