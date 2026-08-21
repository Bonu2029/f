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
