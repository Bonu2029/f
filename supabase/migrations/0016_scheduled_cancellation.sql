-- =============================================================================
-- 0016 — when a subscription is scheduled to end
-- =============================================================================
--
-- A customer cancelled through the Stripe portal. Stripe recorded it by setting
-- `cancel_at` to the end of the period and `canceled_at` to the moment they
-- clicked, and left `cancel_at_period_end` false. This application read only
-- `cancel_at_period_end`, so it went on showing "Renews September 22" to
-- somebody who had already cancelled — and would have gone on serving them and
-- then stopped without warning.
--
-- Two signals mean the same thing and only one was being read. Worse, the one
-- being read is a boolean: it can say THAT a subscription ends but never WHEN,
-- so the interface inferred the date from the billing period. Those are not the
-- same date — a cancellation can be scheduled for any future moment through the
-- API — and inferring it produces a confident, wrong day on the one screen a
-- customer checks to find out how long they have left.
--
-- So the date itself is stored, and the interface stops guessing.
-- =============================================================================

alter table public.subscriptions
  add column if not exists cancel_at timestamptz;

comment on column public.subscriptions.cancel_at is
  'When Stripe will end this subscription, if an end has been scheduled. Independent of cancel_at_period_end: the Stripe portal sets this and leaves that boolean false, so both must be read.';

-- -----------------------------------------------------------------------------
-- Postcondition.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'cancel_at'
  ) then
    raise exception 'subscriptions.cancel_at is missing; a scheduled cancellation would be invisible';
  end if;
end $$;
