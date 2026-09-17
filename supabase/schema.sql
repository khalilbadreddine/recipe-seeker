-- ============================================================================
-- The Recipe Seeker — Supabase schema for accounts & user data
-- ============================================================================
-- HOW TO APPLY (the site owner does this once):
--   1. Open your Supabase project dashboard.
--   2. Go to "SQL Editor" in the left sidebar.
--   3. Click "New query", paste this ENTIRE file, and click "Run".
--   4. You should see "Success. No rows returned" — the tables are ready.
--
-- SECURITY MODEL:
--   Row Level Security (RLS) is enabled on both tables. A single policy per
--   table lets a signed-in user do anything ONLY on rows where
--   auth.uid() = user_id (their own rows). The frontend only ever uses the
--   public "publishable" key — the secret service_role key is never used.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- favorites: recipes a user hearted (user_id, recipe_slug)
-- ----------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_slug)
);

alter table public.favorites enable row level security;

drop policy if exists "Users manage only their own favorites" on public.favorites;
create policy "Users manage only their own favorites"
  on public.favorites
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- day_plans: one "Build Your Day" plan per user (JSONB)
-- ----------------------------------------------------------------------------
create table if not exists public.day_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan jsonb not null default '{"breakfast":[],"lunch":[],"dinner":[],"snacks":[]}',
  updated_at timestamptz not null default now()
);

alter table public.day_plans enable row level security;

drop policy if exists "Users manage only their own day plan" on public.day_plans;
create policy "Users manage only their own day plan"
  on public.day_plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
