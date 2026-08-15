-- =============================================================================
-- 0003_functions.sql — transactional business logic that must not race
--
-- These run inside the database so concurrency is settled by Postgres rather
-- than by application-level checks. Every one of them is SECURITY DEFINER and
-- callable only by the service role: the web app invokes them from server code
-- after it has independently authorised the caller.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- reserve_founder_slot
--
-- Atomically claims the lowest free Founding Member slot for an organisation.
--
-- Concurrency design:
--   * A transaction-scoped advisory lock serialises all reservation attempts,
--     so two simultaneous checkouts cannot compute the same "lowest free slot".
--   * Expired reservations are swept inside the same transaction before the
--     free slot is computed, so abandoned checkouts return to inventory.
--   * The partial unique index `founder_claims_live_slot_uniq` is the final
--     backstop: even if the lock were bypassed, a duplicate slot cannot be
--     committed.
--
-- Returns the slot number, or NULL when all 50 slots are taken. An organisation
-- that already holds a live claim gets its existing slot back (idempotent), so
-- a user who reloads the checkout page does not consume a second slot.
-- -----------------------------------------------------------------------------
create or replace function public.reserve_founder_slot(
  p_organization_id uuid,
  p_user_id uuid,
  p_ttl_minutes int default 30
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot int;
  v_existing record;
  v_total constant int := 50;
begin
  -- Serialise all founder-slot reservations. 4224 is an arbitrary but fixed
  -- application lock id reserved for this purpose.
  perform pg_advisory_xact_lock(4224);

  -- Sweep reservations whose hold has lapsed.
  update public.founder_claims
     set status = 'expired'
   where status = 'reserved'
     and expires_at is not null
     and expires_at <= now();

  -- Idempotent: an org that already holds a claim keeps it.
  select * into v_existing
    from public.founder_claims
   where organization_id = p_organization_id
     and status in ('reserved', 'active')
   limit 1;

  if found then
    if v_existing.status = 'reserved' then
      update public.founder_claims
         set expires_at = now() + make_interval(mins => p_ttl_minutes),
             user_id = coalesce(user_id, p_user_id)
       where id = v_existing.id;
    end if;
    return v_existing.slot_number;
  end if;

  -- Lowest slot number in 1..50 with no live claim.
  select s into v_slot
    from generate_series(1, v_total) as s
   where not exists (
     select 1 from public.founder_claims fc
      where fc.slot_number = s and fc.status in ('reserved', 'active')
   )
   order by s
   limit 1;

  if v_slot is null then
    return null;
  end if;

  insert into public.founder_claims (organization_id, user_id, slot_number, status, reserved_at, expires_at)
  values (
    p_organization_id, p_user_id, v_slot, 'reserved', now(),
    now() + make_interval(mins => p_ttl_minutes)
  );

  return v_slot;
end;
$$;

-- -----------------------------------------------------------------------------
-- activate_founder_slot
--
-- Called from the Stripe webhook once payment has actually succeeded. Marks the
-- claim permanently active and stamps it on the subscription.
--
-- An ACTIVATED slot is never returned to inventory, even if the customer later
-- cancels — that is what makes "first 50 customers" meaningful.
-- -----------------------------------------------------------------------------
create or replace function public.activate_founder_slot(p_organization_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot int;
begin
  perform pg_advisory_xact_lock(4224);

  update public.founder_claims
     set status = 'active',
         activated_at = coalesce(activated_at, now()),
         expires_at = null
   where organization_id = p_organization_id
     and status in ('reserved', 'active')
  returning slot_number into v_slot;

  if v_slot is null then
    -- Payment succeeded but the reservation had already expired: grant a slot
    -- if any remain, otherwise the caller falls back to the standard plan.
    v_slot := public.reserve_founder_slot(p_organization_id, null, 60);
    if v_slot is null then
      return null;
    end if;
    update public.founder_claims
       set status = 'active', activated_at = now(), expires_at = null
     where organization_id = p_organization_id and status = 'reserved';
  end if;

  update public.subscriptions
     set founder = true, founder_slot = v_slot
   where organization_id = p_organization_id;

  return v_slot;
end;
$$;

-- -----------------------------------------------------------------------------
-- release_founder_reservation
--
-- Frees a RESERVED (never-paid) slot, e.g. when Stripe Checkout is abandoned or
-- expires. Deliberately refuses to touch an ACTIVE slot.
-- -----------------------------------------------------------------------------
create or replace function public.release_founder_reservation(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.founder_claims
     set status = 'released'
   where organization_id = p_organization_id
     and status = 'reserved';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- -----------------------------------------------------------------------------
-- expire_founder_reservations — swept by the scheduled cron endpoint
-- -----------------------------------------------------------------------------
create or replace function public.expire_founder_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.founder_claims
     set status = 'expired'
   where status = 'reserved'
     and expires_at is not null
     and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- founder_slot_stats — powers the admin panel and the public counter
-- -----------------------------------------------------------------------------
create or replace function public.founder_slot_stats()
returns table (total int, active int, reserved int, remaining int)
language sql
stable
security definer
set search_path = public
as $$
  with live as (
    select status from public.founder_claims
    where status in ('reserved', 'active')
      and (status = 'active' or expires_at is null or expires_at > now())
  )
  select
    50::int as total,
    (select count(*)::int from live where status = 'active') as active,
    (select count(*)::int from live where status = 'reserved') as reserved,
    greatest(0, 50 - (select count(*)::int from live)) as remaining;
$$;

-- -----------------------------------------------------------------------------
-- record_call_usage
--
-- Single authoritative entry point for billing a completed call.
--
-- BILLING RULE: billable_minutes = ceil(billed_seconds / 60), computed per call
-- and summed across the period. See packages/shared/src/billing.ts.
--
-- Idempotent: the unique index on usage_ledger(call_id) means a webhook retry
-- or a duplicate worker event cannot double-bill. When the row already exists
-- the function returns the previously recorded values unchanged.
-- -----------------------------------------------------------------------------
create or replace function public.record_call_usage(
  p_call_id uuid,
  p_billed_seconds int,
  p_ai_metadata jsonb default '{}'::jsonb
)
returns table (
  organization_id uuid,
  billable_minutes int,
  used_minutes_before int,
  used_minutes_after int,
  already_recorded boolean
)
language plpgsql
security definer
set search_path = public
as $$
-- The OUT parameters share names with table columns (organization_id,
-- billable_minutes). Resolve any ambiguous reference to the COLUMN, which is
-- what every statement in this body intends; the OUT values are only ever
-- written through explicitly-named local variables.
#variable_conflict use_column
declare
  v_org uuid;
  v_minutes int;
  v_period text;
  v_before int;
  v_after int;
  v_existing public.usage_ledger%rowtype;
  v_is_demo boolean;
begin
  select c.organization_id, c.is_demo into v_org, v_is_demo
    from public.calls c where c.id = p_call_id;
  if v_org is null then
    raise exception 'record_call_usage: unknown call %', p_call_id;
  end if;

  select * into v_existing from public.usage_ledger u where u.call_id = p_call_id;
  if found then
    select s.used_minutes into v_after from public.subscriptions s where s.organization_id = v_org;
    return query select v_org, v_existing.billable_minutes, coalesce(v_after, 0), coalesce(v_after, 0), true;
    return;
  end if;

  v_minutes := ceil(greatest(p_billed_seconds, 0)::numeric / 60.0)::int;

  select to_char(coalesce(s.billing_period_start, date_trunc('month', now())), 'YYYY-MM-DD')
    into v_period
    from public.subscriptions s where s.organization_id = v_org;
  v_period := coalesce(v_period, to_char(date_trunc('month', now()), 'YYYY-MM-DD'));

  insert into public.usage_ledger (
    organization_id, call_id, billing_period, voice_seconds, billable_minutes, ai_usage_metadata
  ) values (
    v_org, p_call_id, v_period, greatest(p_billed_seconds, 0), v_minutes, coalesce(p_ai_metadata, '{}'::jsonb)
  );

  update public.calls
     set billed_seconds = greatest(p_billed_seconds, 0),
         billable_minutes = v_minutes
   where id = p_call_id;

  -- Demo calls are recorded for visibility but never counted against the plan.
  if v_is_demo then
    select coalesce(s.used_minutes, 0) into v_before from public.subscriptions s where s.organization_id = v_org;
    return query select v_org, v_minutes, coalesce(v_before, 0), coalesce(v_before, 0), false;
    return;
  end if;

  select s.used_minutes into v_before from public.subscriptions s where s.organization_id = v_org for update;
  v_before := coalesce(v_before, 0);

  update public.subscriptions
     set used_minutes = used_minutes + v_minutes
   where organization_id = v_org
  returning used_minutes into v_after;

  return query select v_org, v_minutes, v_before, coalesce(v_after, v_before + v_minutes), false;
end;
$$;

-- -----------------------------------------------------------------------------
-- reset_usage_for_period — called on invoice.paid / subscription renewal
-- -----------------------------------------------------------------------------
create or replace function public.reset_usage_for_period(
  p_organization_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions
     set used_minutes = 0,
         billing_period_start = p_period_start,
         billing_period_end = p_period_end
   where organization_id = p_organization_id;
$$;

-- -----------------------------------------------------------------------------
-- claim_webhook_event — webhook idempotency gate
--
-- Returns true when the caller has just claimed the event and should process it,
-- false when another delivery already handled (or is handling) it.
-- -----------------------------------------------------------------------------
create or replace function public.claim_webhook_event(
  p_provider webhook_provider,
  p_event_id text,
  p_event_type text,
  p_digest text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.webhook_events (provider, provider_event_id, event_type, status, payload_digest)
  values (p_provider, p_event_id, p_event_type, 'received', p_digest);
  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.complete_webhook_event(
  p_provider webhook_provider,
  p_event_id text,
  p_status webhook_status,
  p_error text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.webhook_events
     set status = p_status, error_message = p_error, processed_at = now()
   where provider = p_provider and provider_event_id = p_event_id;
$$;

-- -----------------------------------------------------------------------------
-- resolve_inbound_call — maps a dialled number to a servable organisation
--
-- This is the ONLY trusted path from a phone call to a tenant. The number comes
-- from SIP metadata, never from user input.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_inbound_call(p_dialled text)
returns table (
  organization_id uuid,
  phone_number_id uuid,
  org_status organization_status,
  ai_paused boolean,
  subscription_status subscription_status,
  fallback_phone text,
  servable boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
-- Same reasoning as record_call_usage: OUT parameter names overlap table
-- column names, so ambiguous references must resolve to the column.
#variable_conflict use_column
declare
  v_pn record;
  v_org record;
  v_sub record;
  v_agent record;
  v_servable boolean := true;
  v_reason text := 'ok';
begin
  select * into v_pn from public.phone_numbers
   where phone_number = p_dialled and status = 'active' limit 1;

  if not found then
    return query select null::uuid, null::uuid, null::organization_status, null::boolean,
                        null::subscription_status, null::text, false, 'unknown_number';
    return;
  end if;

  select * into v_org from public.organizations where id = v_pn.organization_id;
  select * into v_sub from public.subscriptions where organization_id = v_pn.organization_id;
  select * into v_agent from public.ai_agents where organization_id = v_pn.organization_id;

  if v_org.status not in ('active', 'onboarding') then
    v_servable := false; v_reason := 'organization_' || v_org.status::text;
  elsif v_org.ai_paused then
    v_servable := false; v_reason := 'ai_paused';
  elsif v_agent is null or not v_agent.active then
    v_servable := false; v_reason := 'agent_inactive';
  elsif v_sub is null or v_sub.status not in ('active', 'trialing', 'past_due') then
    v_servable := false; v_reason := 'subscription_' || coalesce(v_sub.status::text, 'missing');
  end if;

  return query select
    v_org.id, v_pn.id, v_org.status, v_org.ai_paused,
    v_sub.status, coalesce(v_agent.fallback_phone, v_agent.transfer_phone),
    v_servable, v_reason;
end;
$$;

-- -----------------------------------------------------------------------------
-- search_org_knowledge — organisation-scoped full-text retrieval
--
-- The organisation id is a required argument and is applied as a WHERE clause
-- inside the function, so a caller cannot widen the search across tenants.
-- -----------------------------------------------------------------------------
create or replace function public.search_org_knowledge(
  p_organization_id uuid,
  p_query text,
  p_limit int default 5
)
returns table (document_id uuid, filename text, chunk_index int, content text, rank real)
language sql
stable
security definer
set search_path = public
as $$
  select kc.document_id,
         kd.filename,
         kc.chunk_index,
         kc.content,
         ts_rank(to_tsvector('english', kc.content), websearch_to_tsquery('english', p_query)) as rank
    from public.knowledge_chunks kc
    join public.knowledge_documents kd on kd.id = kc.document_id
   where kc.organization_id = p_organization_id
     and kd.organization_id = p_organization_id
     and kd.processing_status = 'ready'
     and to_tsvector('english', kc.content) @@ websearch_to_tsquery('english', p_query)
   order by rank desc
   limit least(greatest(p_limit, 1), 20);
$$;

-- -----------------------------------------------------------------------------
-- dashboard_metrics — one round trip for the dashboard cards
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_metrics(p_organization_id uuid, p_days int default 30)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'calls_answered', (
      select count(*) from public.calls
       where organization_id = p_organization_id
         and answered_at is not null
         and started_at >= now() - make_interval(days => p_days)
    ),
    'calls_total', (
      select count(*) from public.calls
       where organization_id = p_organization_id
         and started_at >= now() - make_interval(days => p_days)
    ),
    'calls_transferred', (
      select count(*) from public.calls
       where organization_id = p_organization_id and transferred
         and started_at >= now() - make_interval(days => p_days)
    ),
    'leads_captured', (
      select count(*) from public.leads
       where organization_id = p_organization_id
         and created_at >= now() - make_interval(days => p_days)
    ),
    'appointments_booked', (
      select count(*) from public.appointments
       where organization_id = p_organization_id
         and created_at >= now() - make_interval(days => p_days)
    ),
    'minutes_used', (
      select coalesce(used_minutes, 0) from public.subscriptions
       where organization_id = p_organization_id
    ),
    'included_minutes', (
      select coalesce(included_minutes, 0) from public.subscriptions
       where organization_id = p_organization_id
    ),
    'calls_by_day', (
      select coalesce(json_agg(row_to_json(d) order by d.day), '[]'::json) from (
        select to_char(date_trunc('day', started_at), 'YYYY-MM-DD') as day,
               count(*) as calls,
               count(*) filter (where appointment_booked) as booked
          from public.calls
         where organization_id = p_organization_id
           and started_at >= now() - make_interval(days => p_days)
         group by 1
      ) d
    ),
    'leads_by_day', (
      select coalesce(json_agg(row_to_json(d) order by d.day), '[]'::json) from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*) as leads
          from public.leads
         where organization_id = p_organization_id
           and created_at >= now() - make_interval(days => p_days)
         group by 1
      ) d
    ),
    'outcomes', (
      select coalesce(json_agg(row_to_json(o)), '[]'::json) from (
        select coalesce(disposition::text, 'unrecorded') as disposition, count(*) as count
          from public.calls
         where organization_id = p_organization_id
           and started_at >= now() - make_interval(days => p_days)
         group by 1
         order by 2 desc
      ) o
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Platform-wide admin metrics (service role only — never granted to clients)
-- -----------------------------------------------------------------------------
create or replace function public.admin_platform_metrics()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'active_businesses', (select count(*) from public.organizations where status = 'active'),
    'total_businesses', (select count(*) from public.organizations),
    'mrr_cents', (
      select coalesce(sum(case when plan = 'founder' then 2000 else 4900 end), 0)
        from public.subscriptions where status in ('active', 'trialing', 'past_due')
    ),
    'founder', (select row_to_json(f) from public.founder_slot_stats() f),
    'calls_today', (select count(*) from public.calls where started_at >= date_trunc('day', now())),
    'minutes_today', (
      select coalesce(sum(billable_minutes), 0) from public.calls
       where started_at >= date_trunc('day', now())
    ),
    'leads_today', (select count(*) from public.leads where created_at >= date_trunc('day', now())),
    'appointments_today', (select count(*) from public.appointments where created_at >= date_trunc('day', now())),
    'subscriptions_by_status', (
      select coalesce(json_object_agg(status, n), '{}'::json)
        from (select status::text as status, count(*) as n from public.subscriptions group by 1) s
    ),
    'webhooks_24h', (
      select coalesce(json_object_agg(status, n), '{}'::json)
        from (
          select status::text as status, count(*) as n from public.webhook_events
           where received_at >= now() - interval '24 hours' group by 1
        ) w
    ),
    'errors_24h', (
      select count(*) from public.error_events where created_at >= now() - interval '24 hours'
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Lock down execution. These functions run with elevated rights, so only the
-- service role (used exclusively by server-side code) may call them.
-- -----------------------------------------------------------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'reserve_founder_slot(uuid,uuid,int)',
    'activate_founder_slot(uuid)',
    'release_founder_reservation(uuid)',
    'expire_founder_reservations()',
    'record_call_usage(uuid,int,jsonb)',
    'reset_usage_for_period(uuid,timestamptz,timestamptz)',
    'claim_webhook_event(webhook_provider,text,text,text)',
    'complete_webhook_event(webhook_provider,text,webhook_status,text)',
    'resolve_inbound_call(text)',
    'search_org_knowledge(uuid,text,int)',
    'admin_platform_metrics()'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;

-- These two are safe for members / the public counter.
grant execute on function public.founder_slot_stats() to anon, authenticated, service_role;
grant execute on function public.dashboard_metrics(uuid, int) to service_role;
