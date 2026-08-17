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
