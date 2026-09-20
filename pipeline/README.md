# The Recipe Seeker — Growth Automation Pipeline

Semi-automated content engine: mine Pinterest trends → draft posts with an
LLM → **human approval gate** → publish to the blog → schedule pins.
The analytics feedback loop is intentionally **not built** (owner's decision,
2026-09-18).

Everything pipeline-related lives in this folder, alone and self-contained.
The only file outside it is the Review Console page
(`client/src/pages/admin/ReviewConsole.jsx` + its route), because it has to
be part of the site.

## The one rule

**No fully-autonomous publish path.** Every draft sits at
`status = pending_review` until a human flips it to `approved` in the Review
Console. This is enforced twice:

1. **Database layer** (`supabase/schema-pipeline.sql`):
   - `drafts.live_url` can only be set when status is `approved`/`published`
     (CHECK constraint)
   - `pins` rows can only reference `published` drafts (trigger)
   - `drafts.status` can only move forward along the allowed flow (trigger)
2. **Script layer** (`scripts/lib/guardrails.mjs`): the publisher and pin
   scheduler call `assertPublishable` / `assertPinCreatable` and refuse
   anything else. Proven by `node --test pipeline/tests/guardrails.test.mjs`
   (21 tests) and the full-loop simulation
   `node pipeline/tests/e2e-local.mjs` (mock Supabase + mock Pinterest,
   miner → generator → human approval → publisher → scheduler, including
   negative cases).

## Run order

```
1. keyword-miner.mjs    → keyword_candidates (status='new')
2. draft-generator.mjs  → drafts (status='pending_review')
3. Review Console       → human: approve / edit / reject   ← /admin/review
4. publisher.mjs        → recipes.json + status='published' (+ GitHub Action)
5. pin-scheduler.mjs    → Pinterest pins (YOUR part — see docs/)
```

## Setup (once)

1. **Database**: Supabase → SQL Editor → paste
   `supabase/schema-pipeline.sql` → Run. Then add yourself as admin:
   ```sql
   insert into public.pipeline_admins (email)
   values ('your-google-login@example.com') on conflict do nothing;
   ```
2. **Env**: `cp pipeline/.env.example .env`, fill it in. `git check-ignore .env`
   must print `.env` (never commit secrets).
3. **GitHub Action** (publisher): repo Settings → Secrets → Actions →
   add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. The workflow
   `.github/workflows/pipeline-publish.yml` runs daily + on demand.
4. **Pin scheduler**: your part — follow `docs/pin-scheduler-guide.md`.

## The scripts

| Script | Needs | Does |
|---|---|---|
| `keyword-miner.mjs` | Pinterest token | Trends → score → dedupe vs site → top N to `keyword_candidates`. Cap: `MAX_KEYWORDS_PER_DAY` (5). |
| `draft-generator.mjs` | Gemini key **or** `LLM_PROVIDER=manual` | Drafts posts + 3 pin variants → `pending_review`. Auto-writes `personal_note` in the brand character voice (`pipeline/CHARACTER.md`) + auto-generates the hero image (Pollinations.ai via `POLLINATIONS_API_KEY` → Hugging Face via `HF_TOKEN`; both free signups, no card — without keys the draft saves imageless and review requires one). Uploads to Supabase Storage `ai-images`. Flags numeric health claims. Cap: `DRAFTS_PER_DAY` (3). `personal_note` is mandatory — empty = rejected. |
| `publisher.mjs` | Supabase service key | Publishes `approved` drafts into `recipes.json`, marks `published` + `live_url`. Refuses everything else (P1). |
| `pin-scheduler.mjs` | Pinterest token + board id | Creates scheduled pins (`publish_at`, spaced `PIN_SPACING_HOURS` apart) for `published` drafts. Refuses everything else (P2). `--explain` teaches, `--boards` lists boards. |

All scripts support `DRY_RUN=1` (prints, touches nothing).

Every script also writes to the **run log** (`scripts/lib/runlog.mjs`,
best-effort — never breaks a run): it opens a row in `pipeline_runs`,
appends readable lines to `pipeline_events`, and closes with ok/failed +
summary. This is what powers the dashboard's Activity tab.

## Dashboard

Internal page at `/admin/dashboard` (not prerendered, `noindex`, admin
emails only). One place for everything:

| Tab | Shows |
|---|---|
| Overview | 4 stat cards, pipeline health (last run per script), latest activity, quick actions that copy the exact terminal command |
| Keywords | every candidate the miner found: score bar, trend, status |
| Review | the full Review Console embedded — the human gate |
| Published | live posts with their URLs + pin status per post |
| Pins | the pin queue: scheduled vs live, board, times |
| Activity | line-by-line feed of what each script did, filterable by script (reads `pipeline_events`) |
| Settings | pipeline table health check, daily caps, secrets note |

## Review Console

Internal page at `/admin/review` (not prerendered, `noindex`, admin emails
only). Shows flagged numeric claims with a mandatory "I verified the
numbers" checkbox, requires `personal_note` + hero image before approval,
and logs every edit as a `{before, after}` diff in `draft_revisions`.
Also embedded as the Review tab of the dashboard.

## Costs

$0. Supabase free tier, Vercel cron/GitHub Actions free, Pinterest API free,
Gemini via Google AI Studio free tier (or `manual` mode = $0 and no key).

## Deliberately not built

- **Analytics feedback loop** (`pin_metrics` → keyword scoring): skipped per
  owner's decision. Revisit after the manual loop proves itself.
- Multi-pin-per-draft rotation across the 3 variants: v2 idea, one pin per
  draft for now.
