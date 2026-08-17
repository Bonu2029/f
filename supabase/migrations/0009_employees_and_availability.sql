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
