-- =============================================================================
-- 0005_vapi.sql — move voice from raw SIP to Vapi
--
-- Vapi now owns telephony and the voice pipeline (with OpenAI as the model
-- provider inside Vapi), so each organisation carries the two Vapi identifiers
-- the product needs:
--
--   vapi_assistant_id      — the assistant that answers this business's calls
--   vapi_phone_number_id   — the number that assistant is attached to
--
-- Both are nullable: an organisation exists before its receptionist does.
-- =============================================================================

-- Vapi becomes a webhook source alongside Stripe.
do $$ begin
  alter type webhook_provider add value if not exists 'vapi';
exception when others then null; end $$;

alter table public.organizations
  add column if not exists vapi_assistant_id text,
  add column if not exists vapi_phone_number_id text,
  add column if not exists vapi_synced_at timestamptz,
  -- Set when a sync fails, so the dashboard can tell the owner their saved
  -- settings are not live yet instead of implying they are.
  add column if not exists vapi_sync_error text;

-- One assistant and one number may belong to only one organisation.
create unique index if not exists organizations_vapi_assistant_uniq
  on public.organizations (vapi_assistant_id) where vapi_assistant_id is not null;

create unique index if not exists organizations_vapi_number_uniq
  on public.organizations (vapi_phone_number_id) where vapi_phone_number_id is not null;

-- The webhook resolves an inbound call to a tenant by assistant id, so that
-- lookup must be indexed.
create index if not exists organizations_vapi_assistant_lookup
  on public.organizations (vapi_assistant_id);

-- -----------------------------------------------------------------------------
-- phone_numbers: Vapi replaces Twilio as the provider of record
-- -----------------------------------------------------------------------------
alter table public.phone_numbers
  add column if not exists vapi_phone_number_id text;

create unique index if not exists phone_numbers_vapi_id_uniq
  on public.phone_numbers (vapi_phone_number_id) where vapi_phone_number_id is not null;

-- Twilio is no longer part of the MVP path. The column stays so historical rows
-- are not lost, but it is no longer required.
alter table public.phone_numbers alter column twilio_sid drop not null;

-- -----------------------------------------------------------------------------
-- calls: Vapi supplies its own call id and a structured analysis
-- -----------------------------------------------------------------------------
alter table public.calls
  add column if not exists vapi_call_id text,
  add column if not exists vapi_assistant_id text,
  -- The caller's requested day/time, in their own words. The MVP does not book
  -- automatically, so this is what the team acts on.
  add column if not exists requested_appointment text;

create unique index if not exists calls_vapi_call_id_uniq
  on public.calls (vapi_call_id) where vapi_call_id is not null;

-- -----------------------------------------------------------------------------
-- resolve_inbound_call — now keyed on the Vapi assistant id
--
-- This remains the ONLY trusted mapping from a call to a tenant. The assistant
-- id arrives in a signed Vapi webhook, not from anything a caller can influence.
-- -----------------------------------------------------------------------------
drop function if exists public.resolve_inbound_call(text);

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
  v_org record;
  v_sub record;
  v_agent record;
  v_servable boolean := true;
  v_reason text := 'ok';
begin
  select * into v_org from public.organizations o
   where o.vapi_assistant_id = p_assistant_id limit 1;

  if not found then
    return query select null::uuid, null::organization_status, null::boolean,
                        null::subscription_status, false, 'unknown_assistant';
    return;
  end if;

  select * into v_sub from public.subscriptions where organization_id = v_org.id;
  select * into v_agent from public.ai_agents where organization_id = v_org.id;

  if v_org.status not in ('active', 'onboarding') then
    v_servable := false; v_reason := 'organization_' || v_org.status::text;
  elsif v_org.ai_paused then
    v_servable := false; v_reason := 'ai_paused';
  elsif v_agent is null or not v_agent.active then
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
-- Retire the tables that belonged to the removed SIP/Twilio + Google flow.
-- Dropping is deliberate: leaving unreachable tenant tables behind is a
-- liability, not a safety net.
-- -----------------------------------------------------------------------------
drop table if exists public.knowledge_chunks cascade;
drop table if exists public.knowledge_documents cascade;
drop table if exists public.upload_tokens cascade;
drop table if exists public.lead_photos cascade;
drop table if exists public.training_messages cascade;

-- No text messages are sent in this MVP, so a table nothing writes to would
-- only render an always-empty "Text messages" panel that implies a feature.
drop table if exists public.sms_messages cascade;

drop function if exists public.search_org_knowledge(uuid, text, int);

-- Google Calendar is out of the MVP: the assistant has no availability tool, so
-- a connected calendar could not change what happens on a call. Storing OAuth
-- refresh tokens for a feature nothing reads is pure risk, so the tables go too.
drop function if exists public.get_calendar_status(uuid);
drop table if exists public.calendar_connections cascade;
drop table if exists public.oauth_states cascade;

-- vapi_call_id is now the provider identifier of record; external_call_id was
-- its SIP-era twin and holding two unique keys for one concept invites drift.
drop index if exists public.calls_external_id_uniq;
alter table public.calls drop column if exists external_call_id;

-- -----------------------------------------------------------------------------
-- Onboarding is now two settings pages rather than an eight-step wizard, so the
-- step counter only needs to distinguish "not finished" from "finished".
-- -----------------------------------------------------------------------------
alter table public.organizations drop constraint if exists organizations_onboarding_step_check;
alter table public.organizations
  add constraint organizations_onboarding_step_check check (onboarding_step between 1 and 4);

update public.organizations set onboarding_step = least(onboarding_step, 4);
