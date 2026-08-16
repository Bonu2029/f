-- =============================================================================
-- 0008_bootstrap_organization.sql — create a tenant atomically, once
--
-- The application used to build an organisation with nine separate round trips:
-- check whether one exists, insert the organisation, then insert eight child
-- rows, and on any failure DELETE the organisation to "roll back". Two problems
-- follow from that shape, and no amount of client-side care fixes either.
--
--   1. Check-then-insert is not atomic across requests. /onboarding/start is
--      reachable by refresh, back button and double submit, so two requests can
--      both find nothing and both proceed. Recovering after the unique
--      violation means a second network read that may not see what it needs,
--      and the loser then reports a failure for a tenant that exists and is
--      perfectly healthy. That is what happened in production testing.
--
--   2. The delete-on-failure rollback is itself a network call that can fail,
--      leaving an organisation with no members, no agent and no subscription —
--      a tenant every screen assumes cannot exist.
--
-- Both disappear inside one function. The advisory lock is keyed on the user,
-- so concurrent bootstraps for the same person serialise while different people
-- proceed in parallel, and the whole tenant is one transaction: it either
-- exists completely or not at all.
--
-- Defaults stay in TypeScript (`packages/shared`) and arrive as parameters. The
-- prompt builder reads the same constants, so duplicating them here would let
-- the receptionist's rules drift from the rules a business is shown.
-- =============================================================================

create or replace function public.bootstrap_organization(
  p_user_id               uuid,
  p_name                  text,
  p_slug_base             text,
  p_timezone              text,
  p_industry              text,
  p_is_demo               boolean,
  p_agent_name            text,
  p_voice_id              text,
  p_greeting              text,
  p_business_hours        jsonb,
  p_ai_rules              jsonb,
  p_availability_settings jsonb,
  p_included_minutes      int
)
returns table (
  organization_id uuid,
  organization_slug text,
  organization_name text,
  was_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_existing record;
  v_org_id   uuid;
  v_slug     text;
  v_attempt  int := 0;
begin
  -- Serialise concurrent bootstraps for THIS user only. Held to the end of the
  -- transaction, so the check below and the inserts that follow cannot be
  -- interleaved by another request.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select o.id, o.slug, o.name
    into v_existing
    from public.organizations o
   where o.owner_user_id = p_user_id
   order by o.created_at
   limit 1;

  -- Already bootstrapped. Returning it is always what the caller wanted: the
  -- page needs a tenant, and one exists.
  if found then
    return query select v_existing.id, v_existing.slug, v_existing.name, false;
    return;
  end if;

  -- Slugs are globally unique. Suffix until free; the advisory lock does not
  -- help here because the collision is with a different user's business.
  v_slug := p_slug_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'Could not find a free slug for %', p_slug_base;
    end if;
    v_slug := p_slug_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.organizations (name, slug, owner_user_id, timezone, status, onboarding_step, is_demo)
  values (p_name, v_slug, p_user_id, p_timezone, 'onboarding', 1, coalesce(p_is_demo, false))
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, p_user_id, 'owner');

  insert into public.business_profiles (organization_id, display_name, industry, timezone, business_hours)
  values (v_org_id, p_name, p_industry, p_timezone, coalesce(p_business_hours, '[]'::jsonb));

  insert into public.ai_agents (organization_id, name, voice_id, greeting, active)
  values (v_org_id, p_agent_name, p_voice_id, p_greeting, false);

  insert into public.ai_rules (organization_id, title, instruction, priority, enabled, is_system)
  select v_org_id,
         r->>'title',
         r->>'instruction',
         coalesce((r->>'priority')::int, 100),
         true,
         coalesce((r->>'is_system')::boolean, false)
    from jsonb_array_elements(coalesce(p_ai_rules, '[]'::jsonb)) as r;

  insert into public.availability_settings (
    organization_id, appointment_duration, buffer_before, buffer_after,
    min_notice_minutes, max_horizon_days, blackout_dates
  )
  values (
    v_org_id,
    coalesce((p_availability_settings->>'appointment_duration')::int, 60),
    coalesce((p_availability_settings->>'buffer_before')::int, 0),
    coalesce((p_availability_settings->>'buffer_after')::int, 15),
    coalesce((p_availability_settings->>'min_notice_minutes')::int, 120),
    coalesce((p_availability_settings->>'max_horizon_days')::int, 30),
    '{}'
  );

  -- Open days become the starting availability pattern.
  insert into public.availability_rules (organization_id, weekday, start_time, end_time, active)
  select v_org_id,
         (d->>'weekday')::int,
         d->>'open',
         d->>'close',
         true
    from jsonb_array_elements(coalesce(p_business_hours, '[]'::jsonb)) as d
   where coalesce((d->>'closed')::boolean, false) = false;

  insert into public.notification_preferences (organization_id) values (v_org_id);

  insert into public.subscriptions (organization_id, plan, status, included_minutes, used_minutes)
  values (v_org_id, 'standard', 'incomplete', coalesce(p_included_minutes, 500), 0);

  return query select v_org_id, v_slug, p_name, true;
end;
$$;

-- Only the server may call this. It writes across every tenant table, so an
-- authenticated client reaching it directly would be able to mint tenants.
revoke all on function public.bootstrap_organization(
  uuid, text, text, text, text, boolean, text, text, text, jsonb, jsonb, jsonb, int
) from public, anon, authenticated;

grant execute on function public.bootstrap_organization(
  uuid, text, text, text, text, boolean, text, text, text, jsonb, jsonb, jsonb, int
) to service_role;
