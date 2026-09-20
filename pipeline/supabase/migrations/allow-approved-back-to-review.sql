-- Migration: allow sending an approved draft back to review.
--
-- Why: the original G3 status-flow guardrail only allowed
--   pending_review -> approved | rejected
--   approved       -> published | rejected
--   rejected       -> pending_review
-- The dashboard's Content tab now offers "Back to review" on approved drafts,
-- so the flow needs: approved -> pending_review.
--
-- Safety: this does NOT weaken publish safety. The P1 publisher guardrail
-- (assertPublishable), the live_url CHECK constraint, and the
-- "only approved drafts publish" rule are all untouched. A draft that goes
-- back to pending_review must be approved again before it can publish.
--
-- Apply once in the Supabase SQL Editor (Dashboard -> SQL -> New query).

create or replace function public.pipeline_draft_status_flow()
returns trigger as $$
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;
  if OLD.status = 'pending_review' and NEW.status in ('approved', 'rejected') then
    return NEW;
  end if;
  if OLD.status = 'approved' and NEW.status in ('published', 'rejected', 'pending_review') then
    return NEW; -- 'pending_review' added: approved drafts can be sent back for another pass
  end if;
  if OLD.status = 'rejected' and NEW.status = 'pending_review' then
    return NEW; -- allow re-drafting a rejected draft
  end if;
  raise exception 'PIPELINE GUARDRAIL: illegal draft status transition % -> %', OLD.status, NEW.status;
end;
$$ language plpgsql security definer;
