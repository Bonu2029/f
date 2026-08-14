-- =============================================================================
-- NOW — marketplace schema
--
-- This is the target Postgres/Supabase schema. Every table matches a TypeScript
-- interface in `src/lib/types.ts` field-for-field, so moving the prototype off
-- its in-memory store is a transport change rather than a remodel.
--
-- Design notes:
--   * Money is integer cents. Never float, never numeric-without-scale.
--   * Availability is (date, time) in the *business's* local time plus a
--     timezone on the business — a salon's 2:30 PM is 2:30 PM for everyone.
--   * Row Level Security is on for every table. A business can only reach its
--     own rows; a customer can only reach their own; admins are explicit.
--   * Booking is done through a SECURITY DEFINER function that locks the slot
--     row, so two customers can never take the same time.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";           -- distance search
create extension if not exists "pg_trgm";           -- fuzzy business/service search

-- =============================================================================
-- Enums
-- =============================================================================

create type account_type       as enum ('customer', 'business', 'admin');
create type business_status    as enum ('draft', 'pending', 'active', 'suspended', 'rejected');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type member_role        as enum ('owner', 'manager', 'staff');
create type slot_status        as enum ('available', 'held', 'booked', 'expired', 'blocked');
create type appointment_status as enum (
  'pending', 'confirmed', 'completed',
  'cancelled_by_customer', 'cancelled_by_business',
  'no_show', 'refunded', 'disputed'
);
create type payment_status     as enum (
  'requires_payment_method', 'processing', 'succeeded',
  'failed', 'refunded', 'partially_refunded'
);
create type payout_status      as enum ('pending', 'in_transit', 'paid', 'failed');
create type dispute_status     as enum ('open', 'under_review', 'resolved', 'rejected');
create type dispute_kind       as enum (
  'booking_dispute', 'refund_request', 'reported_business',
  'reported_customer', 'reported_review'
);
create type notification_kind  as enum (
  'reminder', 'opening', 'deal', 'booking', 'review', 'message', 'payout', 'system'
);
create type message_sender     as enum ('customer', 'business', 'system');
create type subscription_tier  as enum ('free', 'pro');

-- =============================================================================
-- Accounts
-- =============================================================================

-- Mirrors auth.users; the trigger below keeps them in step.
create table users (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null unique,
  phone         text,
  full_name     text not null,
  avatar_url    text,
  account_type  account_type not null default 'customer',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table customer_profiles (
  user_id             uuid primary key references users on delete cascade,
  default_location_id uuid,
  location_label      text,
  lat                 double precision,
  lng                 double precision,
  search_radius_miles int not null default 10,
  notification_prefs  jsonb not null default '{
    "appointment_reminders": true,
    "last_minute_deals": true,
    "favorite_businesses": true,
    "nearby_openings": true,
    "promotional": false
  }'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =============================================================================
-- Places
-- =============================================================================

create table cities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  state_code    text not null,
  country_code  text not null default 'US',
  lat           double precision not null,
  lng           double precision not null,
  timezone      text not null,
  is_live       boolean not null default false,
  neighborhoods text[] not null default '{}'
);

-- =============================================================================
-- Businesses
-- =============================================================================

create table businesses (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  name                    text not null,
  tagline                 text not null default '',
  about                   text not null default '',
  primary_category_id     uuid not null references service_categories deferrable initially deferred,
  status                  business_status not null default 'draft',
  verification_status     verification_status not null default 'unverified',
  phone                   text not null,
  email                   text not null,
  website                 text,
  address_line1           text not null,
  address_line2           text,
  city_id                 uuid not null references cities,
  neighborhood            text not null default '',
  postal_code             text not null,
  lat                     double precision not null,
  lng                     double precision not null,
  location                geography(point, 4326)
                            generated always as (st_point(lng, lat)::geography) stored,
  timezone                text not null default 'America/New_York',
  rating                  numeric(2,1) not null default 0,
  review_count            int not null default 0,
  price_level             smallint not null default 2 check (price_level between 1 and 3),
  parking_note            text,
  cancellation_policy     jsonb not null default
                            '{"free_cancellation_hours":4,"late_cancellation_fee_pct":50,"no_show_fee_pct":100}'::jsonb,
  -- Null means "use the platform default"; never hard-code a rate downstream.
  commission_bps_override int,
  instant_book            boolean not null default true,
  auto_fill_cancellations boolean not null default false,
  subscription_tier       subscription_tier not null default 'free',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index businesses_location_idx on businesses using gist (location);
create index businesses_status_idx   on businesses (status) where status = 'active';
create index businesses_name_trgm    on businesses using gin (name gin_trgm_ops);

-- A business can appear under several categories (a barber is also "haircut").
create table business_categories (
  business_id uuid not null references businesses on delete cascade,
  category_id uuid not null references service_categories on delete cascade,
  primary key (business_id, category_id)
);

create table business_members (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  user_id     uuid not null references users on delete cascade,
  role        member_role not null default 'staff',
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

create table business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at    time,
  closes_at   time,
  is_closed   boolean not null default false,
  unique (business_id, day_of_week),
  check (is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create table business_verifications (
  id                              uuid primary key default gen_random_uuid(),
  business_id                     uuid not null references businesses on delete cascade,
  status                          verification_status not null default 'pending',
  business_registration_submitted boolean not null default false,
  phone_verified                  boolean not null default false,
  email_verified                  boolean not null default false,
  address_verified                boolean not null default false,
  identity_verified               boolean not null default false,
  payout_account_connected        boolean not null default false,
  reviewed_by                     uuid references users,
  reviewed_at                     timestamptz,
  notes                           text,
  created_at                      timestamptz not null default now()
);

-- =============================================================================
-- Catalog
-- =============================================================================

create table service_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  plural_name text not null,
  icon        text not null,
  synonyms    text[] not null default '{}',
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table services (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses on delete cascade,
  category_id            uuid not null references service_categories,
  name                   text not null,
  description            text not null default '',
  duration_minutes       int not null check (duration_minutes > 0),
  buffer_minutes         int not null default 0 check (buffer_minutes >= 0),
  price_cents            int not null check (price_cents >= 0),
  deposit_cents          int check (deposit_cents >= 0),
  online_booking_enabled boolean not null default true,
  is_active              boolean not null default true,
  sort_order             int not null default 0,
  created_at             timestamptz not null default now()
);

create index services_business_idx on services (business_id) where is_active;

create table staff (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses on delete cascade,
  user_id                uuid references users on delete set null,
  full_name              text not null,
  role                   text not null default '',
  bio                    text not null default '',
  rating                 numeric(2,1) not null default 0,
  review_count           int not null default 0,
  is_active              boolean not null default true,
  accepts_online_booking boolean not null default true,
  created_at             timestamptz not null default now()
);

create table staff_services (
  staff_id   uuid not null references staff on delete cascade,
  service_id uuid not null references services on delete cascade,
  primary key (staff_id, service_id)
);

create table staff_availability (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at   time not null,
  ends_at     time not null,
  is_working  boolean not null default true,
  unique (staff_id, day_of_week),
  check (ends_at > starts_at)
);

-- =============================================================================
-- Availability
-- =============================================================================

create table open_slots (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references businesses on delete cascade,
  staff_id                uuid not null references staff on delete cascade,
  service_id              uuid not null references services on delete cascade,
  date                    date not null,
  start_time              time not null,
  end_time                time not null,
  status                  slot_status not null default 'available',
  original_price_cents    int not null check (original_price_cents >= 0),
  offer_price_cents       int check (offer_price_cents >= 0 and offer_price_cents <= original_price_cents),
  is_last_minute          boolean not null default false,
  visibility_radius_miles int,
  held_until              timestamptz,
  held_by                 uuid references users on delete set null,
  view_count              int not null default 0,
  nearby_reach            int not null default 0,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (end_time > start_time),
  -- A hold must carry an expiry, and only a held slot may have one.
  check ((status = 'held') = (held_until is not null))
);

-- One staff member cannot be in two places at once.
create unique index open_slots_no_overlap on open_slots (staff_id, date, start_time)
  where status <> 'expired';
create index open_slots_search_idx on open_slots (date, status, business_id)
  where status in ('available', 'held');
create index open_slots_held_idx on open_slots (held_until) where status = 'held';

-- =============================================================================
-- Bookings
-- =============================================================================

create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique,
  business_id         uuid not null references businesses on delete restrict,
  customer_id         uuid not null references users on delete restrict,
  staff_id            uuid not null references staff on delete restrict,
  slot_id             uuid references open_slots on delete set null,
  date                date not null,
  start_time          time not null,
  end_time            time not null,
  status              appointment_status not null default 'confirmed',
  from_open_slot      boolean not null default false,
  is_last_minute_deal boolean not null default false,
  subtotal_cents      int not null check (subtotal_cents >= 0),
  service_fee_cents   int not null default 0,
  total_cents         int not null,
  -- Commission is snapshotted: rates change, historical accounting doesn't.
  commission_bps      int not null,
  commission_cents    int not null,
  payout_cents        int not null,
  customer_note       text,
  business_note       text,
  cancellation_reason text,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index appointments_business_date_idx on appointments (business_id, date desc);
create index appointments_customer_idx      on appointments (customer_id, date desc);

create table appointment_services (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null references appointments on delete cascade,
  service_id       uuid not null references services on delete restrict,
  price_cents      int not null,
  list_price_cents int not null,
  duration_minutes int not null
);

-- =============================================================================
-- Money
-- =============================================================================

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  appointment_id           uuid not null references appointments on delete restrict,
  customer_id              uuid not null references users on delete restrict,
  business_id              uuid not null references businesses on delete restrict,
  amount_cents             int not null,
  platform_fee_cents       int not null default 0,
  payout_cents             int not null default 0,
  refunded_cents           int not null default 0,
  status                   payment_status not null default 'requires_payment_method',
  stripe_payment_intent_id text unique,
  payment_method_brand     text,
  payment_method_last4     text,
  created_at               timestamptz not null default now()
);

create table payment_methods (
  id                        uuid primary key default gen_random_uuid(),
  customer_id               uuid not null references users on delete cascade,
  stripe_payment_method_id  text unique,
  brand                     text not null,
  last4                     text not null,
  exp_month                 smallint not null,
  exp_year                  smallint not null,
  is_default                boolean not null default false,
  wallet                    text
);

create table payouts (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses on delete cascade,
  amount_cents     int not null,
  status           payout_status not null default 'pending',
  period_start     date not null,
  period_end       date not null,
  arrival_date     date,
  stripe_payout_id text unique,
  created_at       timestamptz not null default now()
);

-- =============================================================================
-- Social proof & relationships
-- =============================================================================

create table reviews (
  id                  uuid primary key default gen_random_uuid(),
  -- A review cannot exist without a booking. That's what "verified" means.
  appointment_id      uuid not null unique references appointments on delete cascade,
  business_id         uuid not null references businesses on delete cascade,
  customer_id         uuid not null references users on delete cascade,
  staff_id            uuid references staff on delete set null,
  rating              smallint not null check (rating between 1 and 5),
  body                text not null default '',
  photo_urls          text[] not null default '{}',
  business_reply      text,
  business_replied_at timestamptz,
  is_reported         boolean not null default false,
  report_reason       text,
  is_hidden           boolean not null default false,
  created_at          timestamptz not null default now()
);

create table favorites (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references users on delete cascade,
  business_id      uuid not null references businesses on delete cascade,
  alert_on_opening boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (customer_id, business_id)
);

-- =============================================================================
-- Communication
-- =============================================================================

create table message_threads (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses on delete cascade,
  customer_id         uuid not null references users on delete cascade,
  appointment_id      uuid references appointments on delete set null,
  last_message_at     timestamptz not null default now(),
  unread_for_customer int not null default 0,
  unread_for_business int not null default 0,
  created_at          timestamptz not null default now(),
  unique (business_id, customer_id)
);

create table messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references message_threads on delete cascade,
  sender_role message_sender not null,
  sender_id   uuid references users on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users on delete cascade,
  kind       notification_kind not null,
  title      text not null,
  body       text not null default '',
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;

-- =============================================================================
-- Offers, safety, settings
-- =============================================================================

create table promo_offers (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses on delete cascade,
  slot_id         uuid references open_slots on delete cascade,
  service_id      uuid not null references services on delete cascade,
  headline        text not null,
  discount_pct    smallint not null check (discount_pct between 1 and 90),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  max_redemptions int not null default 1,
  redemptions     int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table disputes (
  id                       uuid primary key default gen_random_uuid(),
  kind                     dispute_kind not null,
  appointment_id           uuid references appointments on delete set null,
  business_id              uuid references businesses on delete set null,
  customer_id              uuid references users on delete set null,
  review_id                uuid references reviews on delete set null,
  opened_by_role           text not null,
  reason                   text not null,
  detail                   text not null default '',
  status                   dispute_status not null default 'open',
  resolution_note          text,
  amount_in_question_cents int,
  created_at               timestamptz not null default now(),
  resolved_at              timestamptz
);

-- Single row. The whole marketplace reads its take rate from here.
create table platform_settings (
  id                          boolean primary key default true check (id),
  commission_bps              int not null default 1200,
  customer_service_fee_cents  int not null default 149,
  customer_service_fee_bps    int not null default 400,
  default_free_cancellation_hours int not null default 4,
  slot_hold_seconds           int not null default 300,
  last_minute_window_hours    int not null default 8,
  default_search_radius_miles int not null default 10,
  pro_subscription_price_cents int not null default 3900,
  pro_commission_bps          int not null default 900,
  updated_at                  timestamptz not null default now()
);

insert into platform_settings (id) values (true) on conflict do nothing;

-- =============================================================================
-- Helper predicates used throughout the policies
-- =============================================================================

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from users
    where id = auth.uid() and account_type = 'admin'
  );
$$;

create or replace function manages_business(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members
    where business_id = target and user_id = auth.uid()
  );
$$;

-- =============================================================================
-- Row Level Security
--
-- Default deny. A business reaches only its own rows; a customer reaches only
-- their own; the public reads only what is meant to be public.
-- =============================================================================

alter table users                  enable row level security;
alter table customer_profiles      enable row level security;
alter table businesses             enable row level security;
alter table business_members       enable row level security;
alter table business_hours         enable row level security;
alter table business_verifications enable row level security;
alter table services               enable row level security;
alter table staff                  enable row level security;
alter table staff_services         enable row level security;
alter table staff_availability     enable row level security;
alter table open_slots             enable row level security;
alter table appointments           enable row level security;
alter table appointment_services   enable row level security;
alter table payments               enable row level security;
alter table payment_methods        enable row level security;
alter table payouts                enable row level security;
alter table reviews                enable row level security;
alter table favorites              enable row level security;
alter table message_threads        enable row level security;
alter table messages               enable row level security;
alter table notifications          enable row level security;
alter table promo_offers           enable row level security;
alter table disputes               enable row level security;
alter table platform_settings      enable row level security;
alter table service_categories     enable row level security;
alter table cities                 enable row level security;

-- Public catalog -------------------------------------------------------------
create policy "categories are public"  on service_categories for select using (true);
create policy "cities are public"      on cities             for select using (true);
create policy "settings are readable"  on platform_settings  for select using (true);
create policy "settings admin only"    on platform_settings  for update using (is_admin());

-- Users ----------------------------------------------------------------------
create policy "read own user" on users for select
  using (id = auth.uid() or is_admin());
create policy "update own user" on users for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own profile" on customer_profiles for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());

-- Businesses -----------------------------------------------------------------
create policy "active businesses are public" on businesses for select
  using (status = 'active' or manages_business(id) or is_admin());
create policy "members manage their business" on businesses for update
  using (manages_business(id) or is_admin());

create policy "public reads hours" on business_hours for select using (true);
create policy "members write hours" on business_hours for all
  using (manages_business(business_id)) with check (manages_business(business_id));

create policy "members read membership" on business_members for select
  using (user_id = auth.uid() or manages_business(business_id) or is_admin());

create policy "verification is private" on business_verifications for select
  using (manages_business(business_id) or is_admin());
create policy "only admins verify" on business_verifications for update using (is_admin());

-- Catalog --------------------------------------------------------------------
create policy "public reads services" on services for select
  using (is_active or manages_business(business_id));
create policy "members write services" on services for all
  using (manages_business(business_id)) with check (manages_business(business_id));

create policy "public reads staff" on staff for select
  using (is_active or manages_business(business_id));
create policy "members write staff" on staff for all
  using (manages_business(business_id)) with check (manages_business(business_id));

create policy "public reads staff services" on staff_services for select using (true);
create policy "members write staff services" on staff_services for all using (
  exists (select 1 from staff s where s.id = staff_id and manages_business(s.business_id))
);

create policy "public reads staff availability" on staff_availability for select using (true);
create policy "members write staff availability" on staff_availability for all using (
  exists (select 1 from staff s where s.id = staff_id and manages_business(s.business_id))
);

-- Availability ---------------------------------------------------------------
create policy "public reads bookable slots" on open_slots for select
  using (status in ('available', 'held') or manages_business(business_id) or is_admin());
create policy "members write slots" on open_slots for all
  using (manages_business(business_id)) with check (manages_business(business_id));

-- Bookings -------------------------------------------------------------------
create policy "read own appointments" on appointments for select
  using (customer_id = auth.uid() or manages_business(business_id) or is_admin());
create policy "customers cancel own appointments" on appointments for update
  using (customer_id = auth.uid() or manages_business(business_id))
  with check (customer_id = auth.uid() or manages_business(business_id));
create policy "businesses create appointments" on appointments for insert
  with check (manages_business(business_id));

create policy "read own appointment lines" on appointment_services for select using (
  exists (
    select 1 from appointments a
    where a.id = appointment_id
      and (a.customer_id = auth.uid() or manages_business(a.business_id) or is_admin())
  )
);

-- Money ----------------------------------------------------------------------
create policy "read own payments" on payments for select
  using (customer_id = auth.uid() or manages_business(business_id) or is_admin());
create policy "own payment methods" on payment_methods for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "read own payouts" on payouts for select
  using (manages_business(business_id) or is_admin());

-- Reviews --------------------------------------------------------------------
create policy "public reads visible reviews" on reviews for select
  using (not is_hidden or customer_id = auth.uid() or manages_business(business_id) or is_admin());
-- A customer may only review an appointment of theirs that is completed.
create policy "customers review completed bookings" on reviews for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from appointments a
      where a.id = appointment_id
        and a.customer_id = auth.uid()
        and a.status = 'completed'
    )
  );
create policy "customers edit own reviews" on reviews for update
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "businesses reply to reviews" on reviews for update
  using (manages_business(business_id)) with check (manages_business(business_id));

create policy "own favorites" on favorites for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Communication ---------------------------------------------------------------
create policy "read own threads" on message_threads for select
  using (customer_id = auth.uid() or manages_business(business_id) or is_admin());
create policy "write own threads" on message_threads for all
  using (customer_id = auth.uid() or manages_business(business_id))
  with check (customer_id = auth.uid() or manages_business(business_id));

create policy "read own messages" on messages for select using (
  exists (
    select 1 from message_threads t
    where t.id = thread_id
      and (t.customer_id = auth.uid() or manages_business(t.business_id) or is_admin())
  )
);
create policy "send messages in own threads" on messages for insert with check (
  exists (
    select 1 from message_threads t
    where t.id = thread_id
      and (t.customer_id = auth.uid() or manages_business(t.business_id))
  )
);

create policy "own notifications" on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Offers & safety --------------------------------------------------------------
create policy "public reads active offers" on promo_offers for select
  using (is_active or manages_business(business_id));
create policy "members write offers" on promo_offers for all
  using (manages_business(business_id)) with check (manages_business(business_id));

create policy "read own disputes" on disputes for select
  using (customer_id = auth.uid() or manages_business(business_id) or is_admin());
create policy "open a dispute" on disputes for insert
  with check (customer_id = auth.uid() or manages_business(business_id));
create policy "admins resolve disputes" on disputes for update using (is_admin());

-- =============================================================================
-- Booking: atomic slot claim
--
-- The whole marketplace hinges on this. `for update` locks the slot row, so two
-- concurrent bookings serialise and the loser gets a clean, actionable error
-- instead of a double booking.
-- =============================================================================

create or replace function book_slot(
  p_slot_id       uuid,
  p_customer_id   uuid,
  p_customer_note text default null
) returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_slot        open_slots%rowtype;
  v_service     services%rowtype;
  v_business    businesses%rowtype;
  v_settings    platform_settings%rowtype;
  v_price       int;
  v_fee         int;
  v_bps         int;
  v_commission  int;
  v_appointment appointments%rowtype;
begin
  select * into v_slot from open_slots where id = p_slot_id for update;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  -- Expire a lapsed hold in place rather than blocking on it.
  if v_slot.status = 'held' and v_slot.held_until < now() then
    v_slot.status := 'available';
  end if;

  if v_slot.status = 'booked' then
    raise exception 'slot_already_booked' using errcode = 'P0001';
  end if;

  if v_slot.status = 'held' and v_slot.held_by is distinct from p_customer_id then
    raise exception 'slot_held_by_other' using errcode = 'P0001';
  end if;

  if v_slot.status in ('blocked', 'expired') then
    raise exception 'slot_not_bookable' using errcode = 'P0001';
  end if;

  select * into v_service  from services   where id = v_slot.service_id;
  select * into v_business from businesses where id = v_slot.business_id;
  select * into v_settings from platform_settings where id;

  v_price := coalesce(v_slot.offer_price_cents, v_slot.original_price_cents);
  v_fee   := v_settings.customer_service_fee_cents
             + round(v_price * v_settings.customer_service_fee_bps / 10000.0);
  v_bps   := coalesce(
               v_business.commission_bps_override,
               case when v_business.subscription_tier = 'pro'
                    then v_settings.pro_commission_bps
                    else v_settings.commission_bps end
             );
  v_commission := round(v_price * v_bps / 10000.0);

  insert into appointments (
    reference, business_id, customer_id, staff_id, slot_id,
    date, start_time, end_time, status, from_open_slot, is_last_minute_deal,
    subtotal_cents, service_fee_cents, total_cents,
    commission_bps, commission_cents, payout_cents, customer_note
  ) values (
    'NOW-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)),
    v_slot.business_id, p_customer_id, v_slot.staff_id, v_slot.id,
    v_slot.date, v_slot.start_time, v_slot.end_time, 'confirmed', true,
    v_slot.offer_price_cents is not null,
    v_price, v_fee, v_price + v_fee,
    v_bps, v_commission, v_price - v_commission, p_customer_note
  ) returning * into v_appointment;

  insert into appointment_services (appointment_id, service_id, price_cents, list_price_cents, duration_minutes)
  values (v_appointment.id, v_service.id, v_price, v_slot.original_price_cents, v_service.duration_minutes);

  update open_slots
     set status = 'booked', held_until = null, held_by = null, updated_at = now()
   where id = v_slot.id;

  return v_appointment;
end;
$$;

-- Temporary checkout hold. Same locking discipline as booking.
create or replace function hold_slot(
  p_slot_id     uuid,
  p_customer_id uuid
) returns open_slots
language plpgsql security definer set search_path = public as $$
declare
  v_slot     open_slots%rowtype;
  v_settings platform_settings%rowtype;
begin
  select * into v_settings from platform_settings where id;
  select * into v_slot from open_slots where id = p_slot_id for update;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  if v_slot.status = 'booked' then
    raise exception 'slot_already_booked' using errcode = 'P0001';
  end if;

  if v_slot.status = 'held'
     and v_slot.held_by is distinct from p_customer_id
     and v_slot.held_until > now() then
    raise exception 'slot_held_by_other' using errcode = 'P0001';
  end if;

  update open_slots
     set status     = 'held',
         held_by    = p_customer_id,
         held_until = now() + make_interval(secs => v_settings.slot_hold_seconds),
         updated_at = now()
   where id = p_slot_id
   returning * into v_slot;

  return v_slot;
end;
$$;

-- Sweep expired holds back into inventory (run on a schedule).
create or replace function expire_holds() returns int
language sql security definer set search_path = public as $$
  with released as (
    update open_slots
       set status = 'available', held_until = null, held_by = null, updated_at = now()
     where status = 'held' and held_until < now()
     returning 1
  )
  select count(*)::int from released;
$$;

-- Keep a business's rating denormalised for cheap sorting.
create or replace function refresh_business_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update businesses b
     set rating = coalesce(sub.avg_rating, 0),
         review_count = coalesce(sub.total, 0)
    from (
      select avg(rating)::numeric(2,1) as avg_rating, count(*) as total
        from reviews
       where business_id = coalesce(new.business_id, old.business_id)
         and not is_hidden
    ) sub
   where b.id = coalesce(new.business_id, old.business_id);
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on reviews
  for each row execute function refresh_business_rating();

-- Mirror auth.users into the app's users table on sign-up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into users (id, email, full_name, account_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'account_type')::account_type, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- Search: availability near a point
--
-- The read model the customer app consumes. Distance is computed in Postgres so
-- ranking never round-trips through the client.
-- =============================================================================

create or replace function search_availability(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_miles   double precision default 10,
  p_category_slug  text default null,
  p_from           timestamptz default now(),
  p_to             timestamptz default now() + interval '7 days',
  p_max_price      int default null,
  p_deals_only     boolean default false,
  p_limit          int default 200
) returns table (
  slot_id        uuid,
  business_id    uuid,
  business_name  text,
  business_slug  text,
  service_id     uuid,
  service_name   text,
  staff_id       uuid,
  staff_name     text,
  date           date,
  start_time     time,
  price_cents    int,
  list_price_cents int,
  rating         numeric,
  review_count   int,
  distance_miles double precision
)
language sql stable set search_path = public as $$
  select
    s.id, b.id, b.name, b.slug,
    sv.id, sv.name,
    st.id, st.full_name,
    s.date, s.start_time,
    coalesce(s.offer_price_cents, s.original_price_cents),
    s.original_price_cents,
    b.rating, b.review_count,
    st_distance(b.location, st_point(p_lng, p_lat)::geography) / 1609.344
  from open_slots s
  join businesses b  on b.id = s.business_id and b.status = 'active'
  join services sv   on sv.id = s.service_id and sv.is_active and sv.online_booking_enabled
  join staff st      on st.id = s.staff_id and st.is_active
  left join business_categories bc on bc.business_id = b.id
  left join service_categories c on c.id = bc.category_id
  where s.status = 'available'
    and (s.date + s.start_time) at time zone b.timezone between p_from and p_to
    and st_dwithin(b.location, st_point(p_lng, p_lat)::geography, p_radius_miles * 1609.344)
    and (s.visibility_radius_miles is null
         or st_distance(b.location, st_point(p_lng, p_lat)::geography) / 1609.344
            <= s.visibility_radius_miles)
    and (p_category_slug is null or c.slug = p_category_slug)
    and (p_max_price is null or coalesce(s.offer_price_cents, s.original_price_cents) <= p_max_price)
    and (not p_deals_only or s.offer_price_cents is not null)
  group by s.id, b.id, sv.id, st.id
  order by (s.date + s.start_time) asc
  limit p_limit;
$$;
