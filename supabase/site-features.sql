-- ============================================================================
-- The Recipe Seeker — site features: newsletter, chat gaps, ratings
-- ============================================================================
-- HOW TO APPLY: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Safe to run again (idempotent). Requires schema.sql (accounts)
-- and pipeline/supabase/schema-pipeline.sql (keyword_candidates) first.
--
-- Then set these in Vercel → Project → Settings → Environment Variables and
-- redeploy: SUPABASE_URL, SUPABASE_SERVICE_KEY (server-side only).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- newsletter_subscribers: written only by api/subscribe.mjs (service role).
-- RLS on with NO policies: the public key can neither read nor write it.
-- ----------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  email text primary key check (email = lower(email) and length(email) <= 254),
  source text not null default 'website',
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers add column if not exists unsubscribed_at timestamptz;
alter table public.newsletter_subscribers enable row level security;

-- newsletter_issues: one row per sent weekly issue, so a re-run never double-sends.
create table if not exists public.newsletter_issues (
  issue_key text primary key,              -- e.g. '2026-W40'
  subject text not null,
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.newsletter_issues enable row level security;

-- ----------------------------------------------------------------------------
-- chat_gaps: "Ask Seeker" questions the site couldn't answer well (text only,
-- scrubbed of emails/phone numbers, no IP or user id). Feeds
-- pipeline/scripts/keyword-miner-chat.mjs. Service role only.
-- ----------------------------------------------------------------------------
create table if not exists public.chat_gaps (
  id bigint generated always as identity primary key,
  question text not null check (length(question) <= 300),
  reason text not null check (reason in ('no_match', 'relaxed', 'few')),
  intent jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists chat_gaps_created_at_idx on public.chat_gaps (created_at);
alter table public.chat_gaps enable row level security;

-- ----------------------------------------------------------------------------
-- recipe_ratings: one 1–5 rating per signed-in user per recipe.
-- Users can only see and change their own rows.
-- ----------------------------------------------------------------------------
create table if not exists public.recipe_ratings (
  recipe_slug text not null check (length(recipe_slug) <= 120),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_slug, user_id)
);
alter table public.recipe_ratings enable row level security;

drop policy if exists "Users manage only their own ratings" on public.recipe_ratings;
create policy "Users manage only their own ratings"
  on public.recipe_ratings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public aggregates only (count + average per recipe), never who rated what.
-- Deliberately runs with the view owner's rights so anonymous visitors can read
-- the totals while the underlying rows stay private under RLS.
create or replace view public.recipe_rating_stats as
  select recipe_slug,
         count(*)::int as rating_count,
         round(avg(rating)::numeric, 1) as rating_avg
  from public.recipe_ratings
  group by recipe_slug;
grant select on public.recipe_rating_stats to anon, authenticated;
