'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ToggleChip } from '@/components/ui/Form';
import { addOns } from '@/lib/pricing';
import { currency, formatDuration } from '@/lib/utils';

/** Selectable add-on cards with a running total, shared with the booking flow. */
export function AddOnGrid({
  filterIds,
  compact = false,
}: {
  filterIds?: string[];
  compact?: boolean;
}) {
  const list = filterIds ? addOns.filter((a) => filterIds.includes(a.id)) : addOns;
  const [selected, setSelected] = useState<string[]>([]);

  const chosen = list.filter((addOn) => selected.includes(addOn.id));
  const total = chosen.reduce((sum, addOn) => sum + addOn.price, 0);
  const minutes = chosen.reduce((sum, addOn) => sum + addOn.minutes, 0);

  return (
    <div>
      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {list.map((addOn) => (
          <ToggleChip
            key={addOn.id}
            checked={selected.includes(addOn.id)}
            onChange={(next) =>
              setSelected((current) =>
                next ? [...current, addOn.id] : current.filter((id) => id !== addOn.id),
              )
            }
            label={addOn.label}
            hint={addOn.description}
            price={`${currency(addOn.price)} · ${addOn.minutes}m`}
            icon={<Icon name={addOn.icon} size={18} />}
          />
        ))}
      </div>

      <div
        className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-pearl/50 p-5 sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <div>
          <p className="text-sm text-muted">
            {chosen.length === 0
              ? 'No add-ons selected yet.'
              : `${chosen.length} add-on${chosen.length === 1 ? '' : 's'} selected`}
          </p>
          <p className="font-display text-xl text-ink">
            {chosen.length === 0
              ? 'Add-ons are always optional'
              : `${currency(total)} · about ${formatDuration(minutes)} extra`}
          </p>
        </div>
        <Button href="/build-your-clean" variant="secondary" className="flex-none">
          Add these to a plan
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Placeholder add-on pricing. Final rates are confirmed before your visit and
        shown as separate lines on every estimate.
      </p>
    </div>
  );
}
