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
