-- =============================================================================
-- 0006_mvp_schema.sql — align the schema with the launch MVP
--
-- Three things happen here:
--
--   1. The Vapi assistant identity moves from `organizations` onto `ai_agents`,
--      where it belongs. One organisation has exactly one agent, so the id was
--      never really an organisation attribute — and keeping it on the agent
--      means the id, the settings that produced it and the prompt that was
--      actually pushed all live in one row that can be read atomically.
--
--   2. `ai_agents` is trimmed to the fields the MVP genuinely uses and renamed
--      to the MVP vocabulary (`name`, `voice_id`). Columns for capabilities
--      this build does not have — outbound SMS, photo requests — are dropped
--      rather than left as switches that save but change nothing.
--
--   3. `calls` gains the two fields the Vapi end-of-call report carries that we
--      were discarding: the flattened transcript and the reason the call ended.
--
-- Safe to run on a database that already has 0001–0005 applied, and on a fresh
-- one. Every statement is idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

-- A plain boolean for "has this business finished setting up?". Derived from the
-- existing timestamp rather than stored twice, so the two can never disagree.
alter table public.organizations
  add column if not exists onboarding_completed boolean
    generated always as (onboarding_completed_at is not null) stored;

create index if not exists organizations_onboarding_idx
  on public.organizations (onboarding_completed);

-- -----------------------------------------------------------------------------
-- ai_agents — the receptionist itself
-- -----------------------------------------------------------------------------

do $$ begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'ai_agents' and column_name = 'display_name'
  ) then
    alter table public.ai_agents rename column display_name to name;
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'ai_agents' and column_name = 'voice'
  ) then
    alter table public.ai_agents rename column voice to voice_id;
  end if;
end $$;

alter table public.ai_agents
  -- The assistant that answers this business's calls. Written only by our
  -- server, after Vapi confirms the create/update succeeded.
  add column if not exists vapi_assistant_id text,
  -- The exact system prompt last pushed to Vapi. Stored so an owner (and
  -- support) can see what the receptionist was actually told, rather than
  -- inferring it from the settings that produced it.
  add column if not exists system_prompt text,
  add column if not exists vapi_synced_at timestamptz,
  -- Set when a push to Vapi fails, so the dashboard can say the saved settings
  -- are not live yet instead of implying they are.
  add column if not exists vapi_sync_error text;

-- One assistant belongs to exactly one agent.
create unique index if not exists ai_agents_vapi_assistant_uniq
  on public.ai_agents (vapi_assistant_id) where vapi_assistant_id is not null;

-- The webhook resolves an inbound call to a tenant through this column, so the
-- lookup must be indexed.
create index if not exists ai_agents_vapi_assistant_lookup
  on public.ai_agents (vapi_assistant_id);

-- Carry across anything 0005 wrote at the organisation level.
update public.ai_agents a
   set vapi_assistant_id = coalesce(a.vapi_assistant_id, o.vapi_assistant_id),
       vapi_synced_at    = coalesce(a.vapi_synced_at, o.vapi_synced_at),
       vapi_sync_error   = coalesce(a.vapi_sync_error, o.vapi_sync_error)
  from public.organizations o
 where o.id = a.organization_id
   and o.vapi_assistant_id is not null;

-- The default voice belongs to the Vapi catalogue now.
alter table public.ai_agents alter column voice_id set default 'elliot';
update public.ai_agents set voice_id = 'elliot' where voice_id = 'marin';

-- Fields for capabilities this MVP does not have. A stored switch that changes
-- nothing on a call is worse than no switch, so they go rather than linger.
alter table public.ai_agents
  drop column if exists language,
  drop column if exists speaking_pace,
  drop column if exists response_length,
  drop column if exists sms_enabled,
  drop column if exists photo_requests_enabled,
  drop column if exists disclosure_setting,
  drop column if exists fallback_phone;

-- -----------------------------------------------------------------------------
-- organizations — drop the Vapi columns now owned elsewhere
--
-- `vapi_phone_number_id` belongs to `phone_numbers`, which already carries it
-- alongside the number itself and its status. Two homes for one identifier is
-- how a released number ends up still looking active.
-- -----------------------------------------------------------------------------
drop index if exists public.organizations_vapi_assistant_uniq;
drop index if exists public.organizations_vapi_number_uniq;
drop index if exists public.organizations_vapi_assistant_lookup;

alter table public.organizations
  drop column if exists vapi_assistant_id,
  drop column if exists vapi_phone_number_id,
  drop column if exists vapi_synced_at,
  drop column if exists vapi_sync_error;

-- -----------------------------------------------------------------------------
-- phone_numbers — Vapi is the provider of record
--
-- `vapi_phone_number_id`, `phone_number` and `organization_id` already exist.
-- What goes is the Twilio identifier and the call-forwarding settings: Vapi owns
-- the carrier relationship, and forwarding is expressed on the assistant as
-- `forwardingPhoneNumber`, driven by ai_agents.transfer_phone.
-- -----------------------------------------------------------------------------
alter table public.phone_numbers
  drop column if exists twilio_sid,
  drop column if exists forwarding_mode,
  drop column if exists forwarding_target;

-- -----------------------------------------------------------------------------
-- calls
-- -----------------------------------------------------------------------------
alter table public.calls
  -- The plain-text transcript exactly as the provider rendered it. The
  -- turn-by-turn rows in call_transcript_messages remain the structured view;
  -- this is the copy that survives even when the message array is missing.
  add column if not exists transcript text,
  -- Why the call ended, verbatim from the provider ("customer-ended-call",
  -- "assistant-forwarded-call", "silence-timed-out", …). Kept unparsed: an
  -- enum here would silently drop reasons the provider adds later.
  add column if not exists ended_reason text;

create index if not exists calls_ended_reason_idx
  on public.calls (organization_id, ended_reason);

-- -----------------------------------------------------------------------------
-- resolve_call_by_assistant — follow the assistant id to its new home
--
-- This remains the ONLY trusted mapping from a call to a tenant. The assistant
-- id arrives in a secret-verified Vapi webhook, never from anything a caller
-- can influence.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_call_by_assistant(p_assistant_id text)
returns table (
  organization_id uuid,
  org_status organization_status,
  ai_paused boolean,
  subscription_status subscription_status,
  servable boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
-- OUT parameter names overlap column names; resolve ambiguous references to the
-- column, which is what every statement here intends.
#variable_conflict use_column
declare
  v_agent record;
  v_org   record;
  v_sub   record;
  v_servable boolean := true;
  v_reason text := 'ok';
begin
  select * into v_agent from public.ai_agents a
   where a.vapi_assistant_id = p_assistant_id limit 1;

  if not found then
    return query select null::uuid, null::organization_status, null::boolean,
                        null::subscription_status, false, 'unknown_assistant';
    return;
  end if;

  select * into v_org from public.organizations where id = v_agent.organization_id;

  if not found then
    return query select null::uuid, null::organization_status, null::boolean,
                        null::subscription_status, false, 'unknown_assistant';
    return;
  end if;

  select * into v_sub from public.subscriptions where organization_id = v_org.id;

  if v_org.status not in ('active', 'onboarding') then
    v_servable := false; v_reason := 'organization_' || v_org.status::text;
  elsif v_org.ai_paused then
    v_servable := false; v_reason := 'ai_paused';
  elsif not v_agent.active then
    v_servable := false; v_reason := 'agent_inactive';
  elsif v_sub is null or v_sub.status not in ('active', 'trialing', 'past_due') then
    v_servable := false; v_reason := 'subscription_' || coalesce(v_sub.status::text, 'missing');
  end if;

  return query select v_org.id, v_org.status, v_org.ai_paused, v_sub.status, v_servable, v_reason;
end;
$$;

revoke all on function public.resolve_call_by_assistant(text) from public, anon, authenticated;
grant execute on function public.resolve_call_by_assistant(text) to service_role;

-- -----------------------------------------------------------------------------
-- Verify the tenant tables the MVP depends on are all present and protected.
--
-- This is a guard, not documentation: if a table is missing or its RLS was
-- never enabled, the migration fails loudly here rather than the application
-- discovering it in production.
-- -----------------------------------------------------------------------------
do $$
declare
  required text[] := array[
    'profiles', 'organizations', 'organization_members', 'business_profiles',
    'services', 'faqs', 'ai_agents', 'phone_numbers', 'calls', 'leads',
    'appointments', 'subscriptions', 'usage_ledger', 'founder_claims'
  ];
  t text;
  missing text[] := '{}';
  unprotected text[] := '{}';
begin
  foreach t in array required loop
    if not exists (
      select 1 from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      missing := missing || t;
    elsif t <> 'profiles' and not exists (
      select 1 from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then
      unprotected := unprotected || t;
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception 'Missing required tables: %', array_to_string(missing, ', ');
  end if;

  if array_length(unprotected, 1) is not null then
    raise exception 'Row-level security is not enabled on: %', array_to_string(unprotected, ', ');
  end if;
end $$;

-- `profiles` is keyed on the user, not an organisation, and has its own policy
-- in 0002. Every other table above is organisation-scoped and carries
-- `organization_id`; this asserts that rather than trusting it.
do $$
declare
  scoped text[] := array[
    'organization_members', 'business_profiles', 'services', 'faqs', 'ai_agents',
    'phone_numbers', 'calls', 'leads', 'appointments', 'subscriptions',
    'usage_ledger', 'founder_claims'
  ];
  t text;
  without_org text[] := '{}';
begin
  foreach t in array scoped loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t and column_name = 'organization_id'
    ) then
      without_org := without_org || t;
    end if;
  end loop;

  if array_length(without_org, 1) is not null then
    raise exception 'Tenant tables without organization_id: %', array_to_string(without_org, ', ');
  end if;
end $$;
