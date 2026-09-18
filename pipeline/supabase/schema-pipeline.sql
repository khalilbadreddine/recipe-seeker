-- ============================================================================
-- The Recipe Seeker — Growth Pipeline schema (Supabase / Postgres)
-- ============================================================================
-- WHAT THIS IS:
--   Tables for the semi-automated content pipeline:
--     Keyword Miner -> Draft Generator -> Review Console -> Publisher
--     -> Pin Scheduler. (The analytics feedback loop is intentionally NOT
--     built — owner's decision, 2026-09-18.)
--
-- HOW TO APPLY (owner does this once):
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this ENTIRE file -> Run
--   3. Insert your own login email into pipeline_admins (last section below)
--
-- HARD GUARDRAILS (enforced by the database itself, not app logic):
--   G1. drafts.live_url can ONLY be set when status is 'approved'/'published'
--       (CHECK constraint) — no code path can publish an unapproved draft.
--   G2. pins rows can ONLY reference a draft with status = 'published'
--       (BEFORE INSERT/UPDATE trigger) — no Pin without a live post.
--   G3. drafts.status can only move forward along an allowed flow
--       (trigger) — pending_review -> approved|rejected -> published.
--   G4. RLS: only pipeline admins (or the service_role key used by the
--       scripts) can read/write these tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- pipeline_admins: who is allowed to open the Review Console.
-- The scripts use the service_role key and bypass RLS entirely.
-- ----------------------------------------------------------------------------
create table if not exists public.pipeline_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- keyword_candidates: scored keywords from the Keyword Miner.
-- status: 'new' -> 'drafted' | 'rejected'
-- ----------------------------------------------------------------------------
create table if not exists public.keyword_candidates (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  volume integer,                       -- search volume signal (nullable: API may not return it)
  trend_score numeric,                  -- 0..100 normalized trend strength
  score numeric,                        -- final blended score used for ranking
  status text not null default 'new'
    check (status in ('new', 'drafted', 'rejected')),
  source_run_id text not null,          -- miner run that produced this row
  created_at timestamptz not null default now(),
  unique (keyword, source_run_id)
);

-- ----------------------------------------------------------------------------
-- drafts: one per keyword candidate. NOTHING downstream may read a draft
-- unless status = 'approved' (publisher) or 'published' (pin scheduler).
-- ----------------------------------------------------------------------------
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references public.keyword_candidates(id) on delete set null,
  title text not null,
  description text not null,            -- meta description
  lede text not null,
  category text not null,
  image text not null default '',        -- e.g. /images/slug.webp (set at review time)
  body jsonb not null default '{"sections": [], "faqs": []}',
  allergen_claims text[] not null default '{}',
  flagged_claims jsonb not null default '[]',  -- numeric health claims needing human verification
  personal_note text not null default '',      -- REQUIRED non-empty before publish (G5)
  pin_variants jsonb not null default '[]',    -- 3 x {title, description}
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'published')),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  live_url text,
  created_at timestamptz not null default now(),
  -- G1: a live URL can never exist on an unapproved draft.
  check (live_url is null or status in ('approved', 'published'))
);

-- G3: status may only move forward along the allowed flow.
create or replace function public.pipeline_draft_status_flow()
returns trigger as $$
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;
  if OLD.status = 'pending_review' and NEW.status in ('approved', 'rejected') then
    return NEW;
  end if;
  if OLD.status = 'approved' and NEW.status in ('published', 'rejected') then
    return NEW;
  end if;
  if OLD.status = 'rejected' and NEW.status = 'pending_review' then
    return NEW; -- allow re-drafting a rejected draft
  end if;
  raise exception 'PIPELINE GUARDRAIL: illegal draft status transition % -> %', OLD.status, NEW.status;
end;
$$ language plpgsql security definer;

drop trigger if exists drafts_status_flow on public.drafts;
create trigger drafts_status_flow
  before update of status on public.drafts
  for each row execute function public.pipeline_draft_status_flow();

-- ----------------------------------------------------------------------------
-- draft_revisions: audit log of human edits (LLM output vs. what shipped).
-- ----------------------------------------------------------------------------
create table if not exists public.draft_revisions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  edited_by uuid references auth.users(id) on delete set null,
  edited_at timestamptz not null default now(),
  diff jsonb not null  -- { field: { before: ..., after: ... } }
);

-- ----------------------------------------------------------------------------
-- pins: one Pinterest pin per published draft.
-- ----------------------------------------------------------------------------
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.drafts(id) on delete cascade,
  pinterest_pin_id text,
  board_id text not null,
  title text not null,
  description text not null,
  image_url text not null,
  link text not null,
  publish_at timestamptz,               -- requested schedule time (nullable = immediate)
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- G2: a pin row can only exist for a published draft.
create or replace function public.pipeline_pins_guard()
returns trigger as $$
declare
  s text;
begin
  select status into s from public.drafts where id = NEW.draft_id;
  if s is distinct from 'published' then
    raise exception 'PIPELINE GUARDRAIL: pin requires draft status=published (got %)', s;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists pins_guard on public.pins;
create trigger pins_guard
  before insert or update on public.pins
  for each row execute function public.pipeline_pins_guard();

-- ----------------------------------------------------------------------------
-- RLS: admins only. Scripts use service_role (bypasses RLS).
-- ----------------------------------------------------------------------------
create or replace function public.is_pipeline_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.pipeline_admins
    where email = (auth.jwt() ->> 'email')
  );
end;
$$ language plpgsql security definer stable;

alter table public.pipeline_admins enable row level security;
alter table public.keyword_candidates enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_revisions enable row level security;
alter table public.pins enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pipeline_admins','keyword_candidates','drafts','draft_revisions','pins'] loop
    execute format('drop policy if exists "pipeline admins only" on public.%I', t);
    execute format(
      'create policy "pipeline admins only" on public.%I for all to authenticated using (public.is_pipeline_admin()) with check (public.is_pipeline_admin())',
      t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- OWNER ACTION: insert your login email so the Review Console lets you in.
-- Replace the placeholder, then run just this line:
-- ----------------------------------------------------------------------------
-- insert into public.pipeline_admins (email) values ('you@example.com')
-- on conflict do nothing;

-- =============================================================
-- Run log: what the pipeline is doing, line by line (Activity tab)
-- Scripts write via the service-role key (bypasses RLS).
-- The dashboard reads via the admin policy below.
-- =============================================================
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  script text not null, -- miner | generator | publisher | scheduler
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'ok', 'failed')),
  summary jsonb not null default '{}'::jsonb
);

create table if not exists public.pipeline_events (
  id bigint generated always as identity primary key,
  run_id uuid references public.pipeline_runs(id) on delete cascade,
  script text not null, -- miner | generator | publisher | scheduler
  level text not null default 'info'
    check (level in ('info', 'warn', 'error')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_events_created_idx
  on public.pipeline_events (created_at desc);
create index if not exists pipeline_events_script_idx
  on public.pipeline_events (script);
create index if not exists pipeline_runs_script_idx
  on public.pipeline_runs (script, started_at desc);

alter table public.pipeline_runs enable row level security;
alter table public.pipeline_events enable row level security;

create policy "pipeline admins only"
  on public.pipeline_runs for select to authenticated
  using (public.is_pipeline_admin());

create policy "pipeline admins only"
  on public.pipeline_events for select to authenticated
  using (public.is_pipeline_admin());
