-- ============================================================================
-- The Recipe Seeker — newsletter signups
-- ============================================================================
-- HOW TO APPLY (once): Supabase dashboard → SQL Editor → New query →
-- paste this file → Run. Then in Vercel → Project → Settings →
-- Environment Variables add SUPABASE_URL and SUPABASE_SERVICE_KEY
-- (Supabase → Settings → API) and redeploy. The signup form appears on the
-- site automatically once both are set.
--
-- SECURITY: RLS is enabled with NO policies, so the public/publishable key
-- can neither read nor write this table. Only the server-side function
-- api/subscribe.mjs (service role) inserts rows.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  email text primary key check (email = lower(email) and length(email) <= 254),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Export your list any time:
--   select email, source, created_at from public.newsletter_subscribers order by created_at;
