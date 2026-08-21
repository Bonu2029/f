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
