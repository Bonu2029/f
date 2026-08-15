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
