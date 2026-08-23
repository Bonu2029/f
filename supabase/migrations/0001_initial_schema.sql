-- ============================================================================
-- ServiceTag — initial schema
--
-- Ownership model
--   auth.users (Supabase)  1─1  profiles
--   businesses             1─1  subscriptions
--   businesses             1─n  customers, installations, tags, service_requests
--   tags                   1─1  installations   (a tag points at one install)
--   tags                   1─n  tag_events      (taps / scans)
--
-- Every business-scoped table carries business_id so row level security can be
-- expressed as a single membership check. Nothing is readable across
-- businesses. Public tag pages never read these tables directly — they go
-- through public_tag_view(), which returns only intentionally public columns.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type tag_status as enum ('unassigned', 'active', 'inactive');
create type service_request_status as enum ('new', 'in_progress', 'scheduled', 'closed');
create type service_request_kind as enum ('service', 'appointment');
create type tag_event_kind as enum ('nfc_tap', 'qr_scan', 'direct');
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table businesses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  business_type   text not null,
  phone           text,
  email           text,
  website         text,
  logo_url        text,
  -- Optional booking link surfaced as "Book Appointment" on tag pages.
  booking_url     text,
  -- Shown under "About this business" on tag pages. Public.
  about           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles — one per auth user, links a person to their business
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  business_id  uuid not null references businesses (id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text,
  role         text not null default 'owner',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_business_id_idx on profiles (business_id);

-- ---------------------------------------------------------------------------
-- subscriptions — one per business, mirrors Stripe
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null unique references businesses (id) on delete cascade,
  plan_id                 text not null default 'starter',
  status                  subscription_status not null default 'trialing',
  tag_limit               integer not null default 90,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers — private. Never exposed on a public tag page.
-- ---------------------------------------------------------------------------
create table customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index customers_business_id_idx on customers (business_id);

-- ---------------------------------------------------------------------------
-- installations — what was installed, where, when
-- ---------------------------------------------------------------------------
create table installations (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses (id) on delete cascade,
  customer_id         uuid references customers (id) on delete set null,
  product_name        text not null,
  product_details     text,
  installed_on        date not null,
  warranty_expires_on date,
  -- Internal only. Never returned by public_tag_view().
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index installations_business_id_idx on installations (business_id);
create index installations_customer_id_idx on installations (customer_id);

-- ---------------------------------------------------------------------------
-- tags — the physical NFC tag. The chip stores only the URL built from `code`.
-- ---------------------------------------------------------------------------
create table tags (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses (id) on delete cascade,
  -- Short public code used in /t/<code>. Unique across the whole system.
  code             text not null unique,
  installation_id  uuid references installations (id) on delete set null,
  status           tag_status not null default 'unassigned',
  activated_at     timestamptz,
  last_tapped_at   timestamptz,
  tap_count        integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint tags_code_format check (code ~ '^[A-Z0-9]{6,12}$')
);

create index tags_business_id_idx on tags (business_id);
create index tags_installation_id_idx on tags (installation_id);

-- ---------------------------------------------------------------------------
-- service_requests — submitted from a public tag page, read in the dashboard
-- ---------------------------------------------------------------------------
create table service_requests (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses (id) on delete cascade,
  tag_id        uuid references tags (id) on delete set null,
  customer_id   uuid references customers (id) on delete set null,
  kind          service_request_kind not null default 'service',
  status        service_request_status not null default 'new',
  contact_name  text not null,
  contact_phone text not null,
  message       text not null,
  photo_url     text,
  preferred_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index service_requests_business_id_idx on service_requests (business_id, created_at desc);
create index service_requests_tag_id_idx on service_requests (tag_id);

-- ---------------------------------------------------------------------------
-- tag_events — one row per tap or scan. Feeds the dashboard activity feed.
-- ---------------------------------------------------------------------------
create table tag_events (
  id           uuid primary key default gen_random_uuid(),
  tag_id       uuid not null references tags (id) on delete cascade,
  business_id  uuid not null references businesses (id) on delete cascade,
  kind         tag_event_kind not null default 'nfc_tap',
  -- Coarse, non-identifying context only.
  user_agent   text,
  referrer     text,
  created_at   timestamptz not null default now()
);

create index tag_events_business_id_idx on tag_events (business_id, created_at desc);
create index tag_events_tag_id_idx on tag_events (tag_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses', 'profiles', 'subscriptions', 'customers',
    'installations', 'tags', 'service_requests'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at()', t, t
    );
  end loop;
end;
$$;

-- ============================================================================
-- Row level security
-- ============================================================================

-- Which business does the current user belong to? SECURITY DEFINER so policies
-- can call it without recursing back through profiles' own RLS.
create or replace function current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from profiles where id = auth.uid();
$$;

alter table businesses       enable row level security;
alter table profiles         enable row level security;
alter table subscriptions    enable row level security;
alter table customers        enable row level security;
alter table installations    enable row level security;
alter table tags             enable row level security;
alter table service_requests enable row level security;
alter table tag_events       enable row level security;

-- businesses: a user sees and edits only their own business.
create policy businesses_select on businesses
  for select using (id = current_business_id());
create policy businesses_update on businesses
  for update using (id = current_business_id())
  with check (id = current_business_id());

-- profiles: a user sees only their own row.
create policy profiles_select on profiles
  for select using (id = auth.uid());
create policy profiles_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- subscriptions: readable by the business; writes happen server-side only
-- (Stripe webhooks use the service role, which bypasses RLS).
create policy subscriptions_select on subscriptions
  for select using (business_id = current_business_id());

-- Business-scoped tables: full access within your own business, nothing else.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'installations', 'tags', 'service_requests', 'tag_events'
  ]
  loop
    execute format(
      'create policy %I_all on %I for all
         using (business_id = current_business_id())
         with check (business_id = current_business_id())', t, t
    );
  end loop;
end;
$$;

-- ============================================================================
-- Public surface
--
-- Anonymous visitors never query the tables above. These two SECURITY DEFINER
-- functions are the entire public API, and they return only public columns.
-- ============================================================================

-- Everything a customer tag page is allowed to show. Note the absence of the
-- customer's name, phone, email, address and any internal notes.
create or replace function public_tag_view(tag_code text)
returns table (
  code                text,
  business_name       text,
  business_phone      text,
  business_email      text,
  business_website    text,
  business_logo_url   text,
  business_about      text,
  booking_url         text,
  product_name        text,
  product_details     text,
  installed_on        date,
  warranty_expires_on date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.code,
    b.name,
    b.phone,
    b.email,
    b.website,
    b.logo_url,
    b.about,
    b.booking_url,
    i.product_name,
    i.product_details,
    i.installed_on,
    i.warranty_expires_on
  from tags t
  join businesses b on b.id = t.business_id
  left join installations i on i.id = t.installation_id
  where t.code = upper(tag_code)
    and t.status = 'active';
$$;

grant execute on function public_tag_view(text) to anon, authenticated;

-- Record a tap/scan and bump the tag counters. Returns nothing.
create or replace function record_tag_event(
  tag_code text,
  event_kind tag_event_kind default 'nfc_tap',
  ua text default null,
  ref text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  t record;
begin
  select id, business_id into t from tags
  where code = upper(tag_code) and status = 'active';

  if not found then
    return;
  end if;

  insert into tag_events (tag_id, business_id, kind, user_agent, referrer)
  values (t.id, t.business_id, event_kind, left(ua, 400), left(ref, 400));

  update tags
  set last_tapped_at = now(), tap_count = tap_count + 1
  where id = t.id;
end;
$$;

grant execute on function record_tag_event(text, tag_event_kind, text, text) to anon, authenticated;

-- Submit a service request from a public tag page.
create or replace function submit_service_request(
  tag_code text,
  request_kind service_request_kind,
  name text,
  phone text,
  body text,
  photo text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  t record;
  new_id uuid;
begin
  select id, business_id, installation_id into t from tags
  where code = upper(tag_code) and status = 'active';

  if not found then
    raise exception 'Tag not found';
  end if;

  insert into service_requests (
    business_id, tag_id, customer_id, kind, contact_name, contact_phone,
    message, photo_url
  )
  values (
    t.business_id,
    t.id,
    (select customer_id from installations where id = t.installation_id),
    request_kind,
    left(trim(name), 120),
    left(trim(phone), 40),
    left(trim(body), 2000),
    photo
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function submit_service_request(
  text, service_request_kind, text, text, text, text
) to anon, authenticated;
