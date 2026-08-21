-- =============================================================================
-- AI Front Desk — complete schema bundle
--
-- GENERATED FILE. Do not edit: run `npm run db:bundle` after changing any
-- migration. Source of truth is the individual files in this directory.
--
-- To apply: open your Supabase project -> SQL Editor -> New query, paste this
-- whole file, and Run. Expect "Success. No rows returned".
--
-- ONE-TIME APPLY. This is the whole history concatenated, and the sequence
-- is not re-runnable: a later migration drops columns an earlier one
-- indexes. The guard below stops a second pass before it can fail partway.
-- For incremental changes afterwards, use `npm run db:migrate`.
--
-- Contains, in order: 0001_schema.sql, 0002_rls.sql, 0003_functions.sql, 0004_storage.sql, 0005_vapi.sql, 0006_mvp_schema.sql, 0007_one_org_per_owner.sql, 0008_bootstrap_organization.sql, 0009_employees_and_availability.sql, 0010_no_overlapping_appointments.sql, 0011_upsert_targets.sql, 0012_empty_strings_are_not_values.sql, 0013_appointments_from_calls.sql, 0014_message_deliveries.sql, 0015_no_callback_mode.sql
-- =============================================================================

-- Refuse to run twice. Without this, a second pass fails partway through
-- with a confusing "column does not exist" and leaves you guessing whether
-- anything broke.
do $guard$
declare
  already boolean := false;
begin
  if to_regclass('public.schema_migrations') is not null then
    -- Dynamic, because PL/pgSQL resolves table references when it plans the
    -- block — a static reference would fail on a database where the table
    -- does not exist yet, which is exactly the case this guard allows.
    execute
      'select exists (select 1 from public.schema_migrations where filename = $1)'
      into already using '0015_no_callback_mode.sql';
  end if;

  if already then
    raise exception
      'This database has already been migrated. Use `npm run db:migrate` for incremental changes.';
  end if;
end $guard$;


-- ============================================================================
-- BEGIN 0001_schema.sql
-- ============================================================================

-- =============================================================================
-- 0001_schema.sql — AI Front Desk core schema
--
-- Conventions
--   * Every tenant-owned table carries `organization_id` and is protected by
--     RLS (see 0002_rls.sql). There are no tenant tables without RLS.
--   * All timestamps are `timestamptz` stored in UTC. Display conversion to the
--     organisation timezone happens in the application layer only.
--   * Money is stored as integer cents (bigint) — never floating point.
--   * Enums are Postgres enums so bad values cannot be written even by a
--     service-role client.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type member_role as enum ('owner', 'admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organization_status as enum ('onboarding', 'active', 'paused', 'cancelled', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type founder_claim_status as enum ('reserved', 'active', 'expired', 'released');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_type as enum ('fixed', 'starting_at', 'range', 'quote_only', 'hourly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type processing_status as enum ('pending', 'processing', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_result as enum (
    'in_progress', 'completed', 'transferred', 'voicemail', 'abandoned', 'failed', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_disposition as enum (
    'lead_captured', 'appointment_booked', 'question_answered', 'transferred_to_human',
    'spam', 'wrong_number', 'out_of_service_area', 'no_intent', 'unresolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new', 'qualified', 'appointment_booked', 'contacted', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_score as enum ('hot', 'warm', 'cold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency_level as enum ('emergency', 'urgent', 'soon', 'flexible', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sms_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sms_status as enum ('queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_area_type as enum ('city', 'postal_code', 'radius', 'state');
exception when duplicate_object then null; end $$;

do $$ begin
  create type phone_number_status as enum ('provisioning', 'active', 'released', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forwarding_mode as enum ('all', 'missed_only', 'after_hours', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type webhook_provider as enum ('stripe', 'twilio', 'openai', 'google');
exception when duplicate_object then null; end $$;

do $$ begin
  create type webhook_status as enum ('received', 'processed', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_kind as enum (
    'cancellation', 'refunds', 'deposits', 'service_areas', 'emergency',
    'warranty', 'financing', 'payment_methods', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum (
    'lead_created', 'appointment_booked', 'transfer_failed',
    'usage_70', 'usage_90', 'usage_100',
    'payment_failed', 'calendar_disconnected', 'phone_issue', 'ai_unavailable'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type transcript_role as enum ('assistant', 'user', 'system', 'tool');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  email       citext not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (email);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (length(trim(name)) between 2 and 120),
  slug                    text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  owner_user_id           uuid not null references auth.users(id) on delete restrict,
  timezone                text not null default 'America/New_York',
  status                  organization_status not null default 'onboarding',
  onboarding_step         int not null default 1 check (onboarding_step between 1 and 8),
  onboarding_completed_at timestamptz,
  ai_paused               boolean not null default false,
  is_demo                 boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists organizations_owner_idx on public.organizations (owner_user_id);
create index if not exists organizations_status_idx on public.organizations (status);
create index if not exists organizations_created_idx on public.organizations (created_at desc);
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            member_role not null default 'staff',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists org_members_user_idx on public.organization_members (user_id);
create index if not exists org_members_org_idx on public.organization_members (organization_id);

-- An organisation must always retain at least one owner.
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
as $$
declare
  remaining int;
  target_org uuid;
begin
  target_org := coalesce(old.organization_id, new.organization_id);
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining
    from public.organization_members
    where organization_id = target_org and role = 'owner' and id <> old.id;
    if remaining = 0 then
      raise exception 'An organization must have at least one owner';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists org_members_guard_owner on public.organization_members;
create trigger org_members_guard_owner
  before update or delete on public.organization_members
  for each row execute function public.guard_last_owner();

-- -----------------------------------------------------------------------------
-- business_profiles
-- -----------------------------------------------------------------------------
create table if not exists public.business_profiles (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null unique references public.organizations(id) on delete cascade,
  legal_name           text,
  display_name         text not null,
  industry             text,
  website              text,
  public_phone         text,
  email                citext,
  address              text,
  city                 text,
  state                text,
  postal_code          text,
  country              text not null default 'US',
  timezone             text not null default 'America/New_York',
  business_description text,
  business_hours       jsonb not null default '[]'::jsonb,
  emergency_information text,
  emergency_phone      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
drop trigger if exists business_profiles_updated_at on public.business_profiles;
create trigger business_profiles_updated_at before update on public.business_profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  description        text,
  price_type         price_type not null default 'quote_only',
  starting_price     bigint check (starting_price is null or starting_price >= 0),
  exact_price        bigint check (exact_price is null or exact_price >= 0),
  max_price          bigint check (max_price is null or max_price >= 0),
  price_notes        text,
  estimated_duration int check (estimated_duration is null or estimated_duration between 0 and 2880),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint services_range_valid check (
    price_type <> 'range' or (starting_price is not null and max_price is not null and max_price >= starting_price)
  )
);
create index if not exists services_org_idx on public.services (organization_id, active);
create unique index if not exists services_org_name_uniq on public.services (organization_id, lower(name));
drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- faqs
-- -----------------------------------------------------------------------------
create table if not exists public.faqs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question        text not null check (length(trim(question)) > 0),
  answer          text not null check (length(trim(answer)) > 0),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists faqs_org_idx on public.faqs (organization_id, active);
drop trigger if exists faqs_updated_at on public.faqs;
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- business_policies
-- -----------------------------------------------------------------------------
create table if not exists public.business_policies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            policy_kind not null default 'other',
  title           text not null,
  body            text not null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists business_policies_org_idx on public.business_policies (organization_id, active);
drop trigger if exists business_policies_updated_at on public.business_policies;
create trigger business_policies_updated_at before update on public.business_policies
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- service_areas
-- -----------------------------------------------------------------------------
create table if not exists public.service_areas (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  type                service_area_type not null,
  city                text,
  state               text,
  postal_code         text,
  center_postal_code  text,
  radius_miles        int check (radius_miles is null or radius_miles between 1 and 500),
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists service_areas_org_idx on public.service_areas (organization_id, active);
create index if not exists service_areas_zip_idx on public.service_areas (organization_id, postal_code);

-- -----------------------------------------------------------------------------
-- ai_agents
-- -----------------------------------------------------------------------------
create table if not exists public.ai_agents (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null unique references public.organizations(id) on delete cascade,
  display_name                text not null default 'Mia',
  voice                       text not null default 'marin',
  language                    text not null default 'en',
  personality                 text not null default 'friendly',
  speaking_pace               text not null default 'natural',
  response_length             text not null default 'balanced',
  greeting                    text not null default '',
  instructions                text,
  active                      boolean not null default false,
  transfer_enabled            boolean not null default false,
  transfer_phone              text,
  sms_enabled                 boolean not null default true,
  appointment_booking_enabled boolean not null default true,
  photo_requests_enabled      boolean not null default true,
  disclosure_setting          text not null default 'upfront',
  fallback_phone              text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint ai_agents_transfer_needs_number check (not transfer_enabled or transfer_phone is not null)
);
drop trigger if exists ai_agents_updated_at on public.ai_agents;
create trigger ai_agents_updated_at before update on public.ai_agents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ai_rules
-- -----------------------------------------------------------------------------
create table if not exists public.ai_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  instruction     text not null,
  priority        int not null default 100,
  enabled         boolean not null default true,
  is_system       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_rules_org_idx on public.ai_rules (organization_id, enabled, priority);
drop trigger if exists ai_rules_updated_at on public.ai_rules;
create trigger ai_rules_updated_at before update on public.ai_rules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- knowledge_documents + chunks (organisation-scoped retrieval)
-- -----------------------------------------------------------------------------
create table if not exists public.knowledge_documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  filename          text not null,
  storage_path      text not null,
  mime_type         text not null,
  size_bytes        bigint not null default 0 check (size_bytes >= 0),
  processing_status processing_status not null default 'pending',
  processing_error  text,
  extracted_text    text,
  created_at        timestamptz not null default now()
);
create index if not exists knowledge_documents_org_idx on public.knowledge_documents (organization_id, created_at desc);
create index if not exists knowledge_documents_status_idx on public.knowledge_documents (processing_status);

create table if not exists public.knowledge_chunks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id     uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index     int not null,
  content         text not null,
  created_at      timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index if not exists knowledge_chunks_org_idx on public.knowledge_chunks (organization_id);
-- Full-text search index, always filtered by organization_id at query time.
create index if not exists knowledge_chunks_fts_idx
  on public.knowledge_chunks using gin (to_tsvector('english', content));

-- -----------------------------------------------------------------------------
-- phone_numbers
-- -----------------------------------------------------------------------------
create table if not exists public.phone_numbers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  twilio_sid        text unique,
  phone_number      text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  friendly_name     text,
  capabilities      jsonb not null default '{"voice":true,"sms":true,"mms":false}'::jsonb,
  status            phone_number_status not null default 'provisioning',
  forwarding_target text,
  forwarding_mode   forwarding_mode not null default 'none',
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);
-- One active mapping per number: the inbound call router depends on this.
create unique index if not exists phone_numbers_active_number_uniq
  on public.phone_numbers (phone_number) where status <> 'released';
create index if not exists phone_numbers_org_idx on public.phone_numbers (organization_id, status);

-- -----------------------------------------------------------------------------
-- calendar_connections — tokens are encrypted application-side (AES-256-GCM)
-- -----------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  provider                text not null default 'google',
  external_account_id     text,
  account_email           text,
  encrypted_access_token  text,
  encrypted_refresh_token text,
  expires_at              timestamptz,
  selected_calendar_id    text,
  active                  boolean not null default true,
  last_error              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (organization_id, provider)
);
create index if not exists calendar_connections_org_idx on public.calendar_connections (organization_id, active);
drop trigger if exists calendar_connections_updated_at on public.calendar_connections;
create trigger calendar_connections_updated_at before update on public.calendar_connections
  for each row execute function public.set_updated_at();

create table if not exists public.oauth_states (
  state           text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null,
  redirect_to     text,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);
create index if not exists oauth_states_expiry_idx on public.oauth_states (expires_at);

-- -----------------------------------------------------------------------------
-- availability
-- -----------------------------------------------------------------------------
create table if not exists public.availability_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday         int not null check (weekday between 0 and 6),
  start_time      text not null,
  end_time        text not null,
  active          boolean not null default true
);
create index if not exists availability_rules_org_idx on public.availability_rules (organization_id, weekday);

create table if not exists public.availability_settings (
  organization_id     uuid primary key references public.organizations(id) on delete cascade,
  appointment_duration int not null default 60 check (appointment_duration between 15 and 480),
  buffer_before        int not null default 0 check (buffer_before between 0 and 240),
  buffer_after         int not null default 15 check (buffer_after between 0 and 240),
  min_notice_minutes   int not null default 120 check (min_notice_minutes >= 0),
  max_horizon_days     int not null default 30 check (max_horizon_days between 1 and 365),
  blackout_dates       text[] not null default '{}',
  updated_at           timestamptz not null default now()
);
drop trigger if exists availability_settings_updated_at on public.availability_settings;
create trigger availability_settings_updated_at before update on public.availability_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- calls (created before leads so leads can reference it, and vice versa via FK
-- added after both exist)
-- -----------------------------------------------------------------------------
create table if not exists public.calls (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  external_call_id text,
  caller_phone     text,
  business_phone   text,
  direction        call_direction not null default 'inbound',
  started_at       timestamptz not null default now(),
  answered_at      timestamptz,
  ended_at         timestamptz,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  billed_seconds   int not null default 0 check (billed_seconds >= 0),
  billable_minutes int not null default 0 check (billable_minutes >= 0),
  result           call_result not null default 'in_progress',
  disposition      call_disposition,
  transferred      boolean not null default false,
  transfer_succeeded boolean,
  appointment_booked boolean not null default false,
  lead_id          uuid,
  summary          text,
  summary_json     jsonb,
  call_tone        text,
  recording_enabled boolean not null default false,
  error_message    text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now()
);
-- Idempotency: a provider call id may only produce one call row per org.
create unique index if not exists calls_external_id_uniq
  on public.calls (external_call_id) where external_call_id is not null;
create index if not exists calls_org_started_idx on public.calls (organization_id, started_at desc);
create index if not exists calls_org_result_idx on public.calls (organization_id, result);
create index if not exists calls_caller_idx on public.calls (organization_id, caller_phone);
create index if not exists calls_lead_idx on public.calls (lead_id);

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  call_id           uuid references public.calls(id) on delete set null,
  name              text,
  phone             text,
  email             citext,
  address           text,
  city              text,
  state             text,
  postal_code       text,
  service_requested text,
  description       text,
  urgency           urgency_level not null default 'unknown',
  lead_score        lead_score not null default 'cold',
  score_reasons     text[] not null default '{}',
  status            lead_status not null default 'new',
  estimated_value   bigint check (estimated_value is null or estimated_value >= 0),
  source            text not null default 'ai_call',
  is_property_owner boolean,
  in_service_area   boolean,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists leads_org_created_idx on public.leads (organization_id, created_at desc);
create index if not exists leads_org_status_idx on public.leads (organization_id, status);
create index if not exists leads_org_score_idx on public.leads (organization_id, lead_score);
create index if not exists leads_phone_idx on public.leads (organization_id, phone);
create index if not exists leads_call_idx on public.leads (call_id);
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.calls drop constraint if exists calls_lead_id_fkey;
alter table public.calls
  add constraint calls_lead_id_fkey foreign key (lead_id)
  references public.leads(id) on delete set null;

-- -----------------------------------------------------------------------------
-- lead_photos
-- -----------------------------------------------------------------------------
create table if not exists public.lead_photos (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  storage_path    text not null,
  mime_type       text not null,
  size_bytes      bigint not null default 0,
  uploaded_at     timestamptz not null default now()
);
create index if not exists lead_photos_lead_idx on public.lead_photos (lead_id, uploaded_at desc);
create index if not exists lead_photos_org_idx on public.lead_photos (organization_id);

-- -----------------------------------------------------------------------------
-- upload_tokens — public, expiring, single-lead photo upload links
-- -----------------------------------------------------------------------------
create table if not exists public.upload_tokens (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  max_files       int not null default 10 check (max_files between 1 and 25),
  used_count      int not null default 0 check (used_count >= 0),
  revoked         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists upload_tokens_lead_idx on public.upload_tokens (lead_id);
create index if not exists upload_tokens_expiry_idx on public.upload_tokens (expires_at);

-- -----------------------------------------------------------------------------
-- call_transcript_messages
-- -----------------------------------------------------------------------------
create table if not exists public.call_transcript_messages (
  id              uuid primary key default gen_random_uuid(),
  call_id         uuid not null references public.calls(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            transcript_role not null,
  text            text not null,
  "timestamp"     timestamptz not null default now(),
  sequence        int not null,
  unique (call_id, sequence)
);
create index if not exists transcript_call_idx on public.call_transcript_messages (call_id, sequence);
create index if not exists transcript_org_idx on public.call_transcript_messages (organization_id);
create index if not exists transcript_fts_idx
  on public.call_transcript_messages using gin (to_tsvector('english', text));

-- -----------------------------------------------------------------------------
-- appointments
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null references public.organizations(id) on delete cascade,
  lead_id                    uuid references public.leads(id) on delete set null,
  call_id                    uuid references public.calls(id) on delete set null,
  external_calendar_event_id text,
  calendar_provider          text,
  customer_name              text not null,
  customer_phone             text,
  customer_email             citext,
  service                    text,
  address                    text,
  start_at                   timestamptz not null,
  end_at                     timestamptz not null,
  status                     appointment_status not null default 'scheduled',
  notes                      text,
  source                     text not null default 'ai_call',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint appointments_time_valid check (end_at > start_at)
);
create index if not exists appointments_org_start_idx on public.appointments (organization_id, start_at);
create index if not exists appointments_org_status_idx on public.appointments (organization_id, status);
create index if not exists appointments_lead_idx on public.appointments (lead_id);
-- Prevents double-booking the same slot for the same organisation.
create unique index if not exists appointments_slot_uniq
  on public.appointments (organization_id, start_at)
  where status in ('scheduled', 'confirmed');
drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sms_messages
-- -----------------------------------------------------------------------------
create table if not exists public.sms_messages (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  lead_id              uuid references public.leads(id) on delete set null,
  call_id              uuid references public.calls(id) on delete set null,
  direction            sms_direction not null,
  from_number          text not null,
  to_number            text not null,
  body                 text not null,
  provider_message_sid text unique,
  status               sms_status not null default 'queued',
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists sms_org_created_idx on public.sms_messages (organization_id, created_at desc);
create index if not exists sms_lead_idx on public.sms_messages (lead_id);
drop trigger if exists sms_updated_at on public.sms_messages;
create trigger sms_updated_at before update on public.sms_messages
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- usage_ledger — append-only record of billable usage
-- -----------------------------------------------------------------------------
create table if not exists public.usage_ledger (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  call_id            uuid references public.calls(id) on delete set null,
  billing_period     text not null,
  voice_seconds      int not null default 0 check (voice_seconds >= 0),
  billable_minutes   int not null default 0 check (billable_minutes >= 0),
  sms_count          int not null default 0 check (sms_count >= 0),
  ai_usage_metadata  jsonb not null default '{}'::jsonb,
  reported_to_stripe boolean not null default false,
  created_at         timestamptz not null default now()
);
-- One usage row per call: makes usage recording idempotent under webhook retry.
create unique index if not exists usage_ledger_call_uniq
  on public.usage_ledger (call_id) where call_id is not null;
create index if not exists usage_ledger_org_period_idx on public.usage_ledger (organization_id, billing_period);
create index if not exists usage_ledger_unreported_idx on public.usage_ledger (reported_to_stripe) where reported_to_stripe = false;

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  plan                   text not null default 'standard',
  status                 subscription_status not null default 'incomplete',
  billing_period_start   timestamptz,
  billing_period_end     timestamptz,
  included_minutes       int not null default 500 check (included_minutes >= 0),
  used_minutes           int not null default 0 check (used_minutes >= 0),
  cancel_at_period_end   boolean not null default false,
  founder                boolean not null default false,
  founder_slot           int check (founder_slot is null or founder_slot between 1 and 50),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create unique index if not exists subscriptions_founder_slot_uniq
  on public.subscriptions (founder_slot) where founder_slot is not null;
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- founder_claims — the Founding 50 inventory
-- -----------------------------------------------------------------------------
create table if not exists public.founder_claims (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slot_number     int not null check (slot_number between 1 and 50),
  status          founder_claim_status not null default 'reserved',
  reserved_at     timestamptz not null default now(),
  expires_at      timestamptz,
  activated_at    timestamptz
);
-- A slot number can only be held once by a live (reserved or active) claim.
-- Expired/released claims keep their history row but free the number.
create unique index if not exists founder_claims_live_slot_uniq
  on public.founder_claims (slot_number)
  where status in ('reserved', 'active');
-- An organisation may only hold one live claim.
create unique index if not exists founder_claims_live_org_uniq
  on public.founder_claims (organization_id)
  where status in ('reserved', 'active');
create index if not exists founder_claims_status_idx on public.founder_claims (status);
create index if not exists founder_claims_expiry_idx on public.founder_claims (expires_at)
  where status = 'reserved';

-- -----------------------------------------------------------------------------
-- webhook_events — idempotency ledger for every inbound provider webhook
-- -----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          webhook_provider not null,
  provider_event_id text not null,
  event_type        text not null,
  status            webhook_status not null default 'received',
  error_message     text,
  payload_digest    text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  unique (provider, provider_event_id)
);
create index if not exists webhook_events_recent_idx on public.webhook_events (provider, received_at desc);
create index if not exists webhook_events_status_idx on public.webhook_events (status, received_at desc);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id   uuid references auth.users(id) on delete set null,
  actor_email     text,
  action          text not null,
  target_type     text,
  target_id       text,
  metadata        jsonb not null default '{}'::jsonb,
  ip_address      text,
  created_at      timestamptz not null default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            notification_kind not null,
  title           text not null,
  body            text,
  link            text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists notifications_org_idx on public.notifications (organization_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (organization_id) where read_at is null;
-- One usage-threshold notification per organisation per billing threshold.
create index if not exists notifications_kind_idx on public.notifications (organization_id, kind, created_at desc);

-- -----------------------------------------------------------------------------
-- notification_preferences
-- -----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  organization_id     uuid primary key references public.organizations(id) on delete cascade,
  email_new_lead      boolean not null default true,
  email_appointment   boolean not null default true,
  email_usage_alerts  boolean not null default true,
  email_billing       boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- team_invites
-- -----------------------------------------------------------------------------
create table if not exists public.team_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           citext not null,
  role            member_role not null default 'staff',
  token_hash      text not null unique,
  invited_by      uuid references auth.users(id) on delete set null,
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists team_invites_org_idx on public.team_invites (organization_id);
create unique index if not exists team_invites_pending_uniq
  on public.team_invites (organization_id, email) where accepted_at is null;

-- -----------------------------------------------------------------------------
-- training_messages — the "Teach Your AI" conversation transcript
-- -----------------------------------------------------------------------------
create table if not exists public.training_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  /** Records what the assistant extracted, so nothing is saved invisibly. */
  extracted       jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists training_messages_org_idx on public.training_messages (organization_id, created_at);

-- -----------------------------------------------------------------------------
-- error_events — structured application error log surfaced in the admin panel
-- -----------------------------------------------------------------------------
create table if not exists public.error_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  severity        text not null default 'error',
  scope           text not null,
  message         text not null,
  request_id      text,
  call_id         uuid,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists error_events_created_idx on public.error_events (created_at desc);
create index if not exists error_events_scope_idx on public.error_events (scope, created_at desc);

-- END 0001_schema.sql


-- ============================================================================
-- BEGIN 0002_rls.sql
-- ============================================================================

-- =============================================================================
-- 0002_rls.sql — Row Level Security
--
-- Threat model: an authenticated user holding a valid Supabase JWT must not be
-- able to read or write ANY row belonging to an organisation they are not a
-- member of, even by crafting raw PostgREST requests against the anon endpoint.
--
-- Strategy
--   * RLS is enabled and FORCED on every tenant table.
--   * Membership is resolved through `public.is_org_member()`, a SECURITY
--     DEFINER function. Using a function (rather than an inline subquery on
--     organization_members) avoids infinite policy recursion and keeps the
--     membership check in one auditable place.
--   * Writes that must stay authoritative (calls, usage, subscriptions,
--     founder claims, webhook events) are readable by members but writable only
--     by the service role, which bypasses RLS. The application never ships the
--     service-role key to the browser.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Membership helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.current_org_role(org uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_org_role(org uuid, minimum member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_org_role(org)
    when 'owner' then 3
    when 'admin' then 2
    when 'staff' then 1
    else 0
  end >= case minimum
    when 'owner' then 3
    when 'admin' then 2
    when 'staff' then 1
    else 0
  end;
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.current_org_role(uuid) from public;
revoke all on function public.has_org_role(uuid, member_role) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.current_org_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, member_role) to authenticated;

-- -----------------------------------------------------------------------------
-- Table privileges
--
-- RLS decides WHICH ROWS a role may touch; GRANT decides whether it may touch
-- the table at all. Supabase applies default grants to `authenticated`, but we
-- state them explicitly so the schema is correct on any PostgreSQL instance and
-- so the privilege surface is auditable in one place rather than inherited.
--
-- `anon` deliberately gets nothing: signed-out visitors reach the database only
-- through the public founder-slot counter function.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','business_profiles','services','faqs',
    'business_policies','service_areas','ai_agents','ai_rules','knowledge_documents',
    'knowledge_chunks','phone_numbers','calendar_connections','oauth_states',
    'availability_rules','availability_settings','calls','leads','lead_photos',
    'upload_tokens','call_transcript_messages','appointments','sms_messages','usage_ledger',
    'subscriptions','founder_claims','webhook_events','audit_logs','notifications',
    'notification_preferences','team_invites','training_messages','error_events'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Enable + force RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','business_profiles','services','faqs',
    'business_policies','service_areas','ai_agents','ai_rules','knowledge_documents',
    'knowledge_chunks','phone_numbers','calendar_connections','oauth_states',
    'availability_rules','availability_settings','calls','leads','lead_photos',
    'upload_tokens','call_transcript_messages','appointments','sms_messages','usage_ledger',
    'subscriptions','founder_claims','webhook_events','audit_logs','notifications',
    'notification_preferences','team_invites','training_messages','error_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Drop any pre-existing policies so this migration is re-runnable.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Teammates may see each other's basic profile (needed for the Team page).
create policy profiles_select_teammates on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members me
      join public.organization_members them
        on them.organization_id = me.organization_id
      where me.user_id = auth.uid() and them.user_id = public.profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

-- A user may create an organisation only with themselves as owner.
create policy organizations_insert_own on public.organizations
  for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.has_org_role(id, 'admin'))
  with check (public.has_org_role(id, 'admin'));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (public.has_org_role(id, 'owner'));

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create policy org_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

-- Bootstrap: the organisation owner inserts their own owner row. All other
-- membership changes go through server-side invite acceptance (service role).
create policy org_members_insert_bootstrap on public.organization_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_user_id = auth.uid()
    )
  );

create policy org_members_update_admin on public.organization_members
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy org_members_delete_admin on public.organization_members
  for delete to authenticated
  using (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Generic tenant tables: members read, admins write
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles','services','faqs','business_policies','service_areas',
    'ai_agents','ai_rules','availability_rules','availability_settings',
    'notification_preferences'
  ]
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$I
        for insert to authenticated with check (public.has_org_role(organization_id, 'admin'));
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$I
        for update to authenticated
        using (public.has_org_role(organization_id, 'admin'))
        with check (public.has_org_role(organization_id, 'admin'));
    $f$, t);
    execute format($f$
      create policy %1$s_delete on public.%1$I
        for delete to authenticated using (public.has_org_role(organization_id, 'admin'));
    $f$, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Operational tables: any member reads and writes (staff work the queue)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['leads','appointments','notifications'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$I
        for insert to authenticated with check (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$I
        for update to authenticated
        using (public.is_org_member(organization_id))
        with check (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

create policy leads_delete on public.leads
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));
create policy appointments_delete on public.appointments
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Read-only-to-clients tables (written exclusively by trusted server code)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'calls','call_transcript_messages','sms_messages','usage_ledger',
    'lead_photos','training_messages'
  ]
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

-- Subscriptions and audit logs are billing/compliance records: owners and
-- admins can read them; nobody can write from the client.
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (public.is_org_member(organization_id));

create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.has_org_role(organization_id, 'admin'));

create policy founder_claims_select on public.founder_claims
  for select to authenticated using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- Secrets: never readable by any client role, even a member
-- -----------------------------------------------------------------------------
-- calendar_connections holds encrypted OAuth tokens. Clients get a redacted
-- view instead of the table (see calendar_connection_status below).
create policy calendar_connections_none on public.calendar_connections
  for select to authenticated using (false);

create policy oauth_states_none on public.oauth_states
  for select to authenticated using (false);

create policy upload_tokens_none on public.upload_tokens
  for select to authenticated using (false);

create policy team_invites_admin_select on public.team_invites
  for select to authenticated using (public.has_org_role(organization_id, 'admin'));

-- webhook_events and error_events are platform-level: service role only.
create policy webhook_events_none on public.webhook_events
  for select to authenticated using (false);

create policy error_events_none on public.error_events
  for select to authenticated using (false);

-- -----------------------------------------------------------------------------
-- Knowledge base — reads are always organisation-scoped. RAG retrieval runs
-- through these same policies so one tenant can never retrieve another's
-- documents.
-- -----------------------------------------------------------------------------
create policy knowledge_documents_select on public.knowledge_documents
  for select to authenticated using (public.is_org_member(organization_id));
create policy knowledge_documents_insert on public.knowledge_documents
  for insert to authenticated with check (public.has_org_role(organization_id, 'admin'));
create policy knowledge_documents_delete on public.knowledge_documents
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));

create policy knowledge_chunks_select on public.knowledge_chunks
  for select to authenticated using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- phone_numbers — members read; provisioning happens server-side
-- -----------------------------------------------------------------------------
create policy phone_numbers_select on public.phone_numbers
  for select to authenticated using (public.is_org_member(organization_id));
create policy phone_numbers_update on public.phone_numbers
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Redacted calendar connection status for the dashboard.
-- The base table is unreadable by any client role because it holds encrypted
-- OAuth tokens. This SECURITY DEFINER function re-checks membership itself and
-- returns only non-secret fields — the tokens never leave the database.
-- -----------------------------------------------------------------------------
create or replace function public.get_calendar_status(org uuid)
returns table (
  provider text,
  account_email text,
  selected_calendar_id text,
  active boolean,
  last_error text,
  has_refresh_token boolean,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.provider, c.account_email, c.selected_calendar_id, c.active, c.last_error,
         (c.encrypted_refresh_token is not null), c.expires_at
  from public.calendar_connections c
  where c.organization_id = org
    and public.is_org_member(org);
$$;

revoke all on function public.get_calendar_status(uuid) from public;
grant execute on function public.get_calendar_status(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Public founder-slot counter — the marketing site needs a live number without
-- exposing any claim rows. Callable anonymously; returns only an integer.
-- -----------------------------------------------------------------------------
create or replace function public.founder_slots_remaining()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    50 - (
      select count(*)::int from public.founder_claims
      where status in ('reserved', 'active')
        and (status = 'active' or expires_at is null or expires_at > now())
    )
  );
$$;

revoke all on function public.founder_slots_remaining() from public;
grant execute on function public.founder_slots_remaining() to anon, authenticated;

-- END 0002_rls.sql


-- ============================================================================
-- BEGIN 0003_functions.sql
-- ============================================================================

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

-- END 0003_functions.sql


-- ============================================================================
-- BEGIN 0004_storage.sql
-- ============================================================================

-- =============================================================================
-- 0004_storage.sql — Supabase Storage buckets and access policies
--
-- Object key convention for every tenant bucket:
--     <organization_id>/<rest-of-path>
-- The first path segment is the organisation id, and the policies below compare
-- it against the caller's membership. A user cannot list or download an object
-- whose first segment is an organisation they do not belong to.
--
-- All three buckets are PRIVATE. Files reach the browser only through
-- short-lived signed URLs minted by server code after an authorisation check.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'knowledge',
    'knowledge',
    false,
    26214400, -- 25 MB
    array[
      'application/pdf',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'lead-photos',
    'lead-photos',
    false,
    15728640, -- 15 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152, -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
-- Object keys are user-influenced, so parse the leading segment defensively:
-- a malformed key yields NULL (and therefore no access) instead of raising.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function public.safe_uuid(text) to anon, authenticated, service_role;

drop policy if exists knowledge_read on storage.objects;
drop policy if exists knowledge_write on storage.objects;
drop policy if exists knowledge_delete on storage.objects;
drop policy if exists lead_photos_read on storage.objects;
drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_write on storage.objects;

-- Knowledge documents: readable by any member, writable by admins.
create policy knowledge_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'knowledge'
    and public.is_org_member(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy knowledge_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'knowledge'
    and public.has_org_role(public.safe_uuid(split_part(name, '/', 1)), 'admin')
  );

create policy knowledge_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'knowledge'
    and public.has_org_role(public.safe_uuid(split_part(name, '/', 1)), 'admin')
  );

-- Lead photos: members read. Writes come only from the public upload endpoint,
-- which validates a signed one-time token server-side and uses the service role,
-- so there is deliberately no client INSERT policy here.
create policy lead_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lead-photos'
    and public.is_org_member(public.safe_uuid(split_part(name, '/', 1)))
  );

-- Avatars are keyed by user id rather than organisation.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

create policy avatars_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

-- END 0004_storage.sql


-- ============================================================================
-- BEGIN 0005_vapi.sql
-- ============================================================================

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

-- END 0005_vapi.sql


-- ============================================================================
-- BEGIN 0006_mvp_schema.sql
-- ============================================================================

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

-- END 0006_mvp_schema.sql


-- ============================================================================
-- BEGIN 0007_one_org_per_owner.sql
-- ============================================================================

-- =============================================================================
-- 0007_one_org_per_owner.sql — one owned organisation per user
--
-- `/onboarding/start` creates the organisation on first visit. That page is
-- reachable by refresh, by the back button, and by a double submit, so two
-- requests can both find no organisation and both create one. The result is a
-- user owning two businesses with their calls, settings and subscription split
-- across them — silently, and painfully to unpick afterwards.
--
-- The application checks before inserting, but a check-then-insert is not a
-- guarantee: two concurrent requests can both pass the check. This index is the
-- guarantee. The application handles the violation by returning the winner's
-- row, so the loser of the race still gets a working page.
--
-- Note what this does NOT restrict: a user may still be a *member* of any
-- number of organisations. Team invitations create rows in
-- `organization_members`, not ownership. This constrains only who is recorded
-- as `owner_user_id`, which is exactly one business per person — the product's
-- model today.
--
-- Transferring ownership stays possible: `owner_user_id` can be updated to any
-- user who does not already own an organisation.
-- =============================================================================

-- Collapse any duplicates that predate this index, keeping the oldest — it is
-- the one whose id the rest of the tenant's rows already reference.
--
-- Deleting is safe here only because a duplicate can only have been created by
-- the race above, seconds apart, before the user did anything with it. A
-- duplicate holding real data would be a different problem, so refuse to guess:
-- report it and let a human decide.
do $$
declare
  risky record;
begin
  for risky in
    select o.id, o.owner_user_id, o.name
      from public.organizations o
     where o.id not in (
             select distinct on (owner_user_id) id
               from public.organizations
              order by owner_user_id, created_at
           )
       and (
             exists (select 1 from public.calls        c where c.organization_id = o.id)
          or exists (select 1 from public.leads        l where l.organization_id = o.id)
          or exists (select 1 from public.appointments a where a.organization_id = o.id)
           )
  loop
    raise exception
      'Organisation % (%) is a duplicate for owner % but holds calls, leads or appointments. '
      'Merge it by hand before applying this migration.',
      risky.name, risky.id, risky.owner_user_id;
  end loop;
end $$;

delete from public.organizations o
 where o.id not in (
   select distinct on (owner_user_id) id
     from public.organizations
    order by owner_user_id, created_at
 );

create unique index if not exists organizations_one_per_owner
  on public.organizations (owner_user_id);

-- END 0007_one_org_per_owner.sql


-- ============================================================================
-- BEGIN 0008_bootstrap_organization.sql
-- ============================================================================

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

-- END 0008_bootstrap_organization.sql


-- ============================================================================
-- BEGIN 0009_employees_and_availability.sql
-- ============================================================================

-- =============================================================================
-- 0009_employees_and_availability.sql — who does the work, and when
--
-- Until now availability was a single weekly pattern for the whole business and
-- appointments belonged to nobody. That is enough to record what a caller asked
-- for. It is not enough to answer "can someone actually be there on Tuesday at
-- 2pm", which is the question the product now has to answer on the phone.
--
-- Four tables and one index change:
--
--   employees              people whose time can be booked
--   employee_availability  each person's weekly working pattern
--   employee_time_off      one-off absences that override the pattern
--   service_employees      which services each person is able to do
--
-- Deliberately NOT modelled yet, because nothing reads them and a column nobody
-- uses is a promise the product has not kept: travel time between jobs, skill
-- levels, per-employee pricing, recurring absence patterns, capacity greater
-- than one per slot.
--
-- An employee is not a login. `organization_members` is who can sign in;
-- `employees` is whose time is bookable. A working owner is both, which is what
-- `user_id` is for — nullable, because most field staff will never have an
-- account.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------
create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Optional link to a login. Set null rather than cascading: losing an account
  -- must not delete the appointment history attached to that person.
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null check (length(trim(name)) between 1 and 120),
  email           citext,
  phone           text,
  -- Shown to the owner on the schedule. Not offered to callers.
  job_title       text,
  /**
   * Bookable means "offer this person's time on a call". Inactive employees
   * keep their history and stop receiving new work — which is what happens
   * when someone leaves, and is not the same as deleting them.
   */
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists employees_org_idx on public.employees (organization_id, active);
create unique index if not exists employees_org_name_uniq
  on public.employees (organization_id, lower(name));
-- One employee record per login per organisation, so a working owner cannot be
-- double-booked through two records.
create unique index if not exists employees_org_user_uniq
  on public.employees (organization_id, user_id) where user_id is not null;

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- employee_availability — the recurring weekly pattern
--
-- Several rows per weekday are allowed on purpose: a split shift (08:00–12:00,
-- 13:00–17:00) is normal in trades, and forcing one row per day would make the
-- lunch break invisible to the booking engine.
-- -----------------------------------------------------------------------------
create table if not exists public.employee_availability (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  weekday         int not null check (weekday between 0 and 6),
  -- Local wall-clock time in the organisation's timezone, as HH:MM. Stored as
  -- text for the same reason business_hours is: a working day is "08:00 on
  -- Tuesdays", not an instant, and it must survive a daylight-saving change.
  start_time      text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time        text not null check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at      timestamptz not null default now(),
  constraint employee_availability_order check (end_time > start_time)
);

create index if not exists employee_availability_lookup
  on public.employee_availability (organization_id, employee_id, weekday);

-- -----------------------------------------------------------------------------
-- employee_time_off — absences that beat the weekly pattern
-- -----------------------------------------------------------------------------
create table if not exists public.employee_time_off (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  -- Absolute instants, unlike the weekly pattern: "off from Friday 5pm until
  -- Monday 8am" is a specific span, not a recurring rule.
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  created_at      timestamptz not null default now(),
  constraint employee_time_off_order check (ends_at > starts_at)
);

create index if not exists employee_time_off_lookup
  on public.employee_time_off (organization_id, employee_id, starts_at, ends_at);

-- -----------------------------------------------------------------------------
-- service_employees — capability
--
-- A service with no rows here is treated by the booking engine as "anyone
-- active can do it", which is the right default for a one-person business and
-- avoids making every new service unbookable until someone is assigned.
-- -----------------------------------------------------------------------------
create table if not exists public.service_employees (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id      uuid not null references public.services(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (service_id, employee_id)
);

create index if not exists service_employees_org_idx
  on public.service_employees (organization_id, employee_id);

-- -----------------------------------------------------------------------------
-- appointments — belong to a person now
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists employee_id uuid references public.employees(id) on delete set null;

create index if not exists appointments_employee_idx
  on public.appointments (organization_id, employee_id, start_at);

-- The old index was (organization_id, start_at): one appointment per BUSINESS
-- at any instant. A three-van plumber could not book two jobs at once, which
-- makes the whole point of tracking employees unreachable. Double-booking is a
-- property of a person, not a company.
drop index if exists public.appointments_slot_uniq;

create unique index if not exists appointments_employee_slot_uniq
  on public.appointments (employee_id, start_at)
  where employee_id is not null and status in ('scheduled', 'confirmed');

-- Appointments with nobody assigned keep the old protection, so the manual
-- "add appointment" form cannot silently create two bookings at one time for a
-- business that has not set employees up yet.
create unique index if not exists appointments_unassigned_slot_uniq
  on public.appointments (organization_id, start_at)
  where employee_id is null and status in ('scheduled', 'confirmed');

-- -----------------------------------------------------------------------------
-- Grants, RLS and policies
--
-- Written out per table rather than looped, so a new table added later cannot
-- be silently omitted from one of the three steps — which is exactly how a
-- tenant table ends up readable by everyone.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'employees','employee_availability','employee_time_off','service_employees'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Read: any member of the organisation. Staff need to see the schedule.
-- Write: admin and owner only. A staff member must not be able to grant
-- themselves working hours or delete a colleague.
do $$
declare t text;
begin
  foreach t in array array[
    'employees','employee_availability','employee_time_off','service_employees'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated
         using (public.is_org_member(organization_id))', t, t);

    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated
         using (public.has_org_role(organization_id, ''admin''))
         with check (public.has_org_role(organization_id, ''admin''))', t, t);
  end loop;
end $$;

-- END 0009_employees_and_availability.sql


-- ============================================================================
-- BEGIN 0010_no_overlapping_appointments.sql
-- ============================================================================

-- =============================================================================
-- 0010_no_overlapping_appointments.sql — one person, one place, one time
--
-- 0009 keyed double-booking on (employee_id, start_at). That catches two
-- appointments starting at the same instant and nothing else: 14:00–15:00 and
-- 14:30–15:30 have different start times, so both were accepted and the
-- employee was booked into two places at once. Verified before writing this.
--
-- A unique index cannot express "these two spans must not overlap"; that needs
-- an exclusion constraint over a range type, which is what this adds.
--
-- This is deliberately in the database rather than the booking engine. The
-- engine will offer only free slots, but two callers can be offered the same
-- slot a second apart and both accept — and by the time the second write
-- arrives, the first is already committed. Application-side checking cannot
-- close that window. The database can, and a booking that is refused is
-- recoverable; a double-booked van is not.
-- =============================================================================

-- Required to mix an equality column with a range column in one GiST index.
-- Available on Supabase; on a bare Postgres it ships with contrib.
create extension if not exists btree_gist;

-- The point-in-time index is now redundant: any pair it would have caught also
-- overlaps, so the new constraint refuses them too.
drop index if exists public.appointments_employee_slot_uniq;

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    employee_id with =,
    -- Half-open: an appointment ending at 15:00 and the next starting at 15:00
    -- do not overlap, which is what back-to-back jobs mean in practice.
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (employee_id is not null and status in ('scheduled', 'confirmed'));

-- Unassigned appointments keep their point-in-time rule. They belong to nobody,
-- so "overlapping" has no meaning for them — but two at the same instant is
-- still almost certainly a mistake in the manual form.
create unique index if not exists appointments_unassigned_slot_uniq
  on public.appointments (organization_id, start_at)
  where employee_id is null and status in ('scheduled', 'confirmed');

-- Cancelling frees the time: the constraint's WHERE clause only covers
-- scheduled and confirmed, so a cancelled or completed row never blocks a
-- rebooking of the same slot.

-- END 0010_no_overlapping_appointments.sql


-- ============================================================================
-- BEGIN 0011_upsert_targets.sql
-- ============================================================================

-- =============================================================================
-- 0011 — make the conflict target the application uses actually inferrable
-- =============================================================================
--
-- Postgres will only use a PARTIAL unique index to resolve `ON CONFLICT (col)`
-- if the statement repeats the index's own predicate. PostgREST — and therefore
-- supabase-js `.upsert(..., { onConflict: 'vapi_call_id' })` — emits no
-- predicate, so `calls_vapi_call_id_uniq` could never satisfy it. Every such
-- upsert failed with 42P10, "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- The visible symptom was worse than the error: a call that could not be served
-- was written by an upsert whose error nobody read, so the webhook reported
-- success, the owner got a notification about a missed call, and `calls` stayed
-- empty. Two different outcomes — recorded and lost — looked identical.
--
-- Dropping the predicate changes nothing about what the index enforces. A
-- plain unique index on a nullable column still permits any number of NULL
-- rows, because NULLs are never equal to one another; it still refuses a
-- duplicate id; and it is inferrable. Verified against Postgres 16 rather than
-- reasoned about.
-- =============================================================================

drop index if exists public.calls_vapi_call_id_uniq;

create unique index if not exists calls_vapi_call_id_uniq
  on public.calls (vapi_call_id);

-- -----------------------------------------------------------------------------
-- Postcondition: the index exists, covers exactly vapi_call_id, and is total.
--
-- A guard rather than a comment: if a later migration reintroduces a predicate
-- here, this fails at deploy time instead of silently losing call records.
-- -----------------------------------------------------------------------------
do $$
declare
  v_predicate text;
  v_cols text;
begin
  select pg_get_expr(i.indpred, i.indrelid),
         (select string_agg(a.attname, ',' order by a.attnum)
            from pg_attribute a
           where a.attrelid = i.indrelid
             and a.attnum = any (i.indkey))
    into v_predicate, v_cols
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
   where c.relname = 'calls_vapi_call_id_uniq';

  if v_cols is null then
    raise exception 'calls_vapi_call_id_uniq is missing; upserts on calls would fail with 42P10';
  end if;

  if v_cols <> 'vapi_call_id' then
    raise exception 'calls_vapi_call_id_uniq covers (%), expected vapi_call_id', v_cols;
  end if;

  if v_predicate is not null then
    raise exception
      'calls_vapi_call_id_uniq is partial (%); ON CONFLICT (vapi_call_id) cannot infer it',
      v_predicate;
  end if;
end $$;

-- END 0011_upsert_targets.sql


-- ============================================================================
-- BEGIN 0012_empty_strings_are_not_values.sql
-- ============================================================================

-- =============================================================================
-- 0012 — an empty string is not a transcript
-- =============================================================================
--
-- Vapi sends `""` rather than omitting a field when a call produced nothing —
-- which is what happens when the caller's microphone never publishes audio. An
-- empty string satisfies `??`, so the reader stored it as a value instead of
-- falling through to the alternative rendering. The rows it produced say "this
-- call has a transcript, and the transcript is nothing", which is not what
-- happened and is not distinguishable in the UI from a call still being
-- processed.
--
-- The reader now normalises at the boundary. This cleans up what it already
-- wrote. Only literal empty and whitespace-only values are touched: anything a
-- person could read is left exactly as it is.
--
-- Deliberately NOT changing `result` on existing rows. Several are recorded as
-- `completed` for calls that failed technically, and the ingestion path now
-- classifies those honestly — but rewriting the recorded outcome of past calls
-- is a different act from removing a value that was never really there.
-- =============================================================================

update public.calls set transcript = null where btrim(coalesce(transcript, '')) = '' and transcript is not null;
update public.calls set summary = null where btrim(coalesce(summary, '')) = '' and summary is not null;
update public.calls set ended_reason = null where btrim(coalesce(ended_reason, '')) = '' and ended_reason is not null;
update public.calls set error_message = null where btrim(coalesce(error_message, '')) = '' and error_message is not null;

-- Leads carry the same free-text fields, written from the same reports.
update public.leads set description = null where btrim(coalesce(description, '')) = '' and description is not null;
update public.leads set notes = null where btrim(coalesce(notes, '')) = '' and notes is not null;

-- -----------------------------------------------------------------------------
-- Postcondition: nothing readable claims to be readable when it is not.
-- -----------------------------------------------------------------------------
do $$
declare
  v_calls int;
  v_leads int;
begin
  select count(*) into v_calls
    from public.calls
   where btrim(coalesce(transcript, 'x')) = ''
      or btrim(coalesce(summary, 'x')) = ''
      or btrim(coalesce(ended_reason, 'x')) = '';

  select count(*) into v_leads
    from public.leads
   where btrim(coalesce(description, 'x')) = ''
      or btrim(coalesce(notes, 'x')) = '';

  if v_calls > 0 or v_leads > 0 then
    raise exception
      'empty-string cleanup missed % call row(s) and % lead row(s)', v_calls, v_leads;
  end if;
end $$;

-- END 0012_empty_strings_are_not_values.sql


-- ============================================================================
-- BEGIN 0013_appointments_from_calls.sql
-- ============================================================================

-- =============================================================================
-- 0013 — an appointment booked during a call, before the call record exists
-- =============================================================================
--
-- The receptionist books while the caller is still on the phone. The `calls`
-- row for that conversation does not exist yet — it is written from the
-- end-of-call report, minutes later — so `appointments.call_id` cannot be set
-- at booking time, and a foreign key to a row that has not been created is not
-- something to work around with a placeholder.
--
-- So the provider's own call id is recorded instead, and the two are joined up
-- when the report finally arrives. Without this the owner sees an appointment
-- and a call and no way to know they were the same conversation.
-- =============================================================================

alter table public.appointments
  add column if not exists vapi_call_id text;

comment on column public.appointments.vapi_call_id is
  'The Vapi call this was booked during. Set at booking time, when the calls row does not exist yet; calls.id is filled in later from the end-of-call report.';

-- One appointment per call is the normal case, but a caller who books two
-- visits in one conversation is legitimate, so this is not unique.
create index if not exists appointments_vapi_call_idx
  on public.appointments (vapi_call_id) where vapi_call_id is not null;

-- -----------------------------------------------------------------------------
-- Postcondition.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'appointments' and column_name = 'vapi_call_id'
  ) then
    raise exception 'appointments.vapi_call_id is missing; calls booked on the phone could not be linked to their conversation';
  end if;
end $$;

-- END 0013_appointments_from_calls.sql


-- ============================================================================
-- BEGIN 0014_message_deliveries.sql
-- ============================================================================

-- =============================================================================
-- 0014 — what was actually sent, to whom, and whether it really left
-- =============================================================================
--
-- The receptionist tells a caller "you'll get a text confirming that". Whether
-- one arrives depends on a provider being configured, a phone number being
-- present, and the send succeeding. None of those are visible from the
-- appointment row, so without this table "confirmation sent" and "confirmation
-- silently skipped because no SMS provider is configured" look identical — to
-- the owner, and to us when the customer says nobody told them.
--
-- `simulated` is the column that matters most. The development adapters log a
-- message instead of delivering it, which is the honest thing for them to do,
-- but a record that does not distinguish a logged message from a delivered one
-- would turn that honesty back into a lie one layer up.
-- =============================================================================

do $$ begin
  create type message_channel as enum ('sms', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_delivery_status as enum ('sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.message_deliveries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id  uuid references public.appointments(id) on delete set null,
  call_id         uuid references public.calls(id) on delete set null,
  lead_id         uuid references public.leads(id) on delete set null,
  channel         message_channel not null,
  -- Who it was addressed to. Kept so a "they never told me" dispute can be
  -- answered with the number or address we actually used.
  recipient       text not null,
  purpose         text not null,
  body            text not null,
  status          message_delivery_status not null,
  /** True when a development adapter logged the message instead of sending it. */
  simulated       boolean not null default false,
  provider        text,
  provider_message_id text,
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists message_deliveries_org_idx
  on public.message_deliveries (organization_id, created_at desc);
create index if not exists message_deliveries_appointment_idx
  on public.message_deliveries (appointment_id) where appointment_id is not null;

-- -----------------------------------------------------------------------------
-- Access. Readable by any member — a staff member answering "did we tell them?"
-- needs it. Written only by the server, because nothing a browser does should
-- be able to claim a message was sent.
-- -----------------------------------------------------------------------------
grant select on public.message_deliveries to authenticated;
grant all on public.message_deliveries to service_role;
revoke all on public.message_deliveries from anon;

alter table public.message_deliveries enable row level security;
alter table public.message_deliveries force row level security;

drop policy if exists message_deliveries_select on public.message_deliveries;
create policy message_deliveries_select on public.message_deliveries
  for select to authenticated
  using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- Postcondition.
-- -----------------------------------------------------------------------------
do $$
declare
  v_rls boolean;
  v_forced boolean;
begin
  select relrowsecurity, relforcerowsecurity into v_rls, v_forced
    from pg_class where oid = 'public.message_deliveries'::regclass;

  if not v_rls or not v_forced then
    raise exception 'message_deliveries is not protected by row-level security';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'message_deliveries' and column_name = 'simulated'
  ) then
    raise exception 'message_deliveries.simulated is missing; a logged message would be indistinguishable from a delivered one';
  end if;
end $$;

-- END 0014_message_deliveries.sql


-- ============================================================================
-- BEGIN 0015_no_callback_mode.sql
-- ============================================================================

-- =============================================================================
-- 0015 — No Callback Mode
-- =============================================================================
--
-- The product's whole claim is that a caller gets an answer on the call rather
-- than a promise that somebody will ring them back. The machinery for that
-- exists — the receptionist reads the real schedule and writes a real
-- appointment — but until now the assistant was free to fall back to "the team
-- will call you" whenever that felt easier, and the owner had no way to say
-- otherwise or to find out how often it happened.
--
-- This is the switch. It is deliberately a stored setting rather than a
-- constant, because it cannot be honoured by every business at every moment:
-- an organisation with nobody on the schedule cannot book anyone, whatever the
-- setting says. The application refuses to turn it on in that state rather than
-- accept a switch that changes nothing.
--
-- No column records "a callback was promised". That is derivable from what
-- already exists — a call whose caller wanted work done and which produced no
-- appointment — and a stored duplicate of a derived fact is a thing that can
-- disagree with the truth.
-- =============================================================================

alter table public.ai_agents
  add column if not exists no_callback_mode boolean not null default false;

comment on column public.ai_agents.no_callback_mode is
  'When true, the receptionist must book on the call and may only offer a callback when it genuinely cannot book. Requires appointment_booking_enabled and at least one employee with working hours; the application refuses to enable it otherwise.';

-- -----------------------------------------------------------------------------
-- Postcondition.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'ai_agents'
       and column_name = 'no_callback_mode'
  ) then
    raise exception 'ai_agents.no_callback_mode is missing';
  end if;

  -- Default false on purpose: an existing business must opt in, not discover
  -- that its receptionist has started refusing to take messages.
  if (
    select column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'ai_agents' and column_name = 'no_callback_mode'
  ) not in ('false', 'false::boolean') then
    raise exception 'no_callback_mode must default to false so it is opt-in';
  end if;
end $$;

-- END 0015_no_callback_mode.sql


-- ============================================================================
-- Mark these migrations as applied, so `npm run db:migrate` against this
-- same database later is a no-op rather than a second pass.
--
-- The checksum is deliberately left as 'bundled'. The migration runner warns
-- when a checksum does not match, which is the correct signal here: it means
-- "this was applied by hand, not by me".
-- ============================================================================
create table if not exists public.schema_migrations (
  filename   text primary key,
  checksum   text not null,
  applied_at timestamptz not null default now()
);

insert into public.schema_migrations (filename, checksum) values
  ('0001_schema.sql', 'bundled'),
  ('0002_rls.sql', 'bundled'),
  ('0003_functions.sql', 'bundled'),
  ('0004_storage.sql', 'bundled'),
  ('0005_vapi.sql', 'bundled'),
  ('0006_mvp_schema.sql', 'bundled'),
  ('0007_one_org_per_owner.sql', 'bundled'),
  ('0008_bootstrap_organization.sql', 'bundled'),
  ('0009_employees_and_availability.sql', 'bundled'),
  ('0010_no_overlapping_appointments.sql', 'bundled'),
  ('0011_upsert_targets.sql', 'bundled'),
  ('0012_empty_strings_are_not_values.sql', 'bundled'),
  ('0013_appointments_from_calls.sql', 'bundled'),
  ('0014_message_deliveries.sql', 'bundled'),
  ('0015_no_callback_mode.sql', 'bundled')
on conflict (filename) do nothing;
