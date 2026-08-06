'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn, formatDate, isoDate } from '@/lib/utils';

export const arrivalWindows = [
  { id: 'morning', label: 'Morning', detail: '8:00am – 10:00am arrival' },
  { id: 'midday', label: 'Midday', detail: '10:00am – 12:00pm arrival' },
  { id: 'afternoon', label: 'Afternoon', detail: '12:00pm – 3:00pm arrival' },
  { id: 'late', label: 'Late afternoon', detail: '3:00pm – 5:00pm arrival' },
];

const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Availability shown here is illustrative. It is deterministic rather than
 * random so the interface never changes under the customer mid-session, and it
 * is replaced by real scheduling data when the backend is connected.
 */
function isAvailable(date: Date) {
  const day = date.getDay();
  if (day === 0) return false;
  return (date.getDate() + day) % 4 !== 0;
}

export function Calendar({
  value,
  onChange,
  minDate = new Date(),
}: {
  value: string | null;
  onChange: (iso: string) => void;
  minDate?: Date;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = new Date(minDate);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const today = useMemo(() => {
    const now = new Date(minDate);
    now.setHours(0, 0, 0, 0);
    return now;
  }, [minDate]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const canGoBack =
    cursor.getFullYear() > today.getFullYear() ||
    (cursor.getFullYear() === today.getFullYear() && cursor.getMonth() > today.getMonth());

  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent transition-colors hover:border-accent hover:bg-mint/25 disabled:opacity-35"
        >
          <span className="sr-only">Previous month</span>
          <Icon name="arrow" size={16} className="rotate-180" />
        </button>
        <p className="font-display text-lg text-ink" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent transition-colors hover:border-accent hover:bg-mint/25"
        >
          <span className="sr-only">Next month</span>
          <Icon name="arrow" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) return <span key={`pad-${index}`} />;
          const iso = isoDate(day);
          const past = day < today;
          const available = !past && isAvailable(day);
          const selected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={!available}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={`${formatDate(day)}${available ? '' : ' — unavailable'}`}
              className={cn(
                'flex h-11 items-center justify-center rounded-xl text-sm transition-all duration-200',
                selected
                  ? 'bg-accent font-semibold text-white shadow-soft'
                  : available
                    ? 'bg-pearl/60 text-ink hover:bg-mint/45'
                    : 'text-muted/45 line-through',
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <Icon name="clock" size={14} className="mt-0.5 text-accent" />
        Availability shown is a demonstration schedule. Real openings are confirmed
        when the booking system is connected.
      </p>
    </div>
  );
}

export function TimeSlotSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-ink">Arrival window</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {arrivalWindows.map((window) => {
          const active = value === window.id;
          return (
            <label
              key={window.id}
              className={cn(
                'cursor-pointer rounded-2xl border p-4 transition-all duration-300 ease-luma',
                active
                  ? 'border-accent bg-mint/25 shadow-soft'
                  : 'border-line bg-white hover:border-sage',
              )}
            >
              <input
                type="radio"
                name="arrival-window"
                className="sr-only"
                checked={active}
                onChange={() => onChange(window.id)}
              />
              <span className="block text-[15px] font-medium text-ink">{window.label}</span>
              <span className="mt-0.5 block text-sm text-muted">{window.detail}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        We hold a two-to-three hour arrival window rather than a single time, and we
        message you when the team is on the way.
      </p>
    </fieldset>
  );
}
