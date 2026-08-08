'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn, formatDuration } from '@/lib/utils';

const previewRooms = [
  { id: 'kitchen', label: 'Kitchen', minutes: 35 },
  { id: 'bathrooms', label: 'Bathrooms', minutes: 30 },
  { id: 'bedrooms', label: 'Bedrooms', minutes: 20 },
  { id: 'living', label: 'Living areas', minutes: 25 },
  { id: 'office', label: 'Office', minutes: 18 },
  { id: 'basement', label: 'Basement', minutes: 25 },
  { id: 'laundry', label: 'Laundry room', minutes: 15 },
  { id: 'balcony', label: 'Balcony or patio', minutes: 18 },
];

const previewTasks = [
  { id: 'fridge', label: 'Inside refrigerator', minutes: 30, icon: 'fridge' },
  { id: 'oven', label: 'Inside oven', minutes: 40, icon: 'oven' },
  { id: 'windows', label: 'Interior windows', minutes: 40, icon: 'window' },
  { id: 'baseboards', label: 'Baseboards', minutes: 40, icon: 'baseboard' },
  { id: 'cabinets', label: 'Cabinet interiors', minutes: 45, icon: 'cabinet' },
  { id: 'pet-hair', label: 'Pet-hair removal', minutes: 30, icon: 'pet' },
  { id: 'laundry-fold', label: 'Laundry folding', minutes: 25, icon: 'laundry' },
  { id: 'linens', label: 'Bed-linen change', minutes: 15, icon: 'linen' },
  { id: 'organize', label: 'Organization assistance', minutes: 60, icon: 'organize' },
];

export function BuildPreview() {
  const reduce = useReducedMotion();
  const [selectedRooms, setSelectedRooms] = useState<string[]>([
    'kitchen',
    'bathrooms',
    'bedrooms',
    'living',
  ]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const toggle = (
    id: string,
    list: string[],
    setList: (next: string[]) => void,
  ) =>
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  const minutes =
    previewRooms
      .filter((room) => selectedRooms.includes(room.id))
      .reduce((sum, room) => sum + room.minutes, 0) +
    previewTasks
      .filter((task) => selectedTasks.includes(task.id))
      .reduce((sum, task) => sum + task.minutes, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <div>
        <p className="eyebrow">Rooms</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {previewRooms.map((room) => {
            const active = selectedRooms.includes(room.id);
            return (
              <button
                key={room.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(room.id, selectedRooms, setSelectedRooms)}
                className={cn(
                  'rounded-full border px-4 py-2.5 text-[15px] transition-all duration-300 ease-luma',
                  active
                    ? 'border-accent bg-accent text-white shadow-soft'
                    : 'border-line bg-white text-ink hover:border-sage hover:bg-mint/20',
                )}
              >
                {room.label}
              </button>
            );
          })}
        </div>

        <p className="eyebrow mt-10">Optional tasks</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {previewTasks.map((task) => {
            const active = selectedTasks.includes(task.id);
            return (
              <button
                key={task.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(task.id, selectedTasks, setSelectedTasks)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-300 ease-luma',
                  active
                    ? 'border-accent bg-mint/30 shadow-soft'
                    : 'border-line bg-white hover:border-sage',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-accent text-white' : 'bg-pearl text-accent',
                  )}
                  aria-hidden="true"
                >
                  <Icon name={task.icon} size={17} />
                </span>
                <span className="text-sm font-medium text-ink">{task.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
          <p className="eyebrow">Preview</p>
          <p className="mt-2 font-display text-2xl text-ink">Your visit so far</p>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Rooms selected</dt>
              <dd className="font-medium text-ink">{selectedRooms.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Optional tasks</dt>
              <dd className="font-medium text-ink">{selectedTasks.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="text-muted">Estimated time on site</dt>
              <dd className="font-display text-xl text-ink">
                <motion.span
                  key={minutes}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  {minutes > 0 ? formatDuration(minutes) : '—'}
                </motion.span>
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-relaxed text-muted">
            This is a preview. The full builder adds per-room priorities,
            household preferences, scheduling and a price breakdown.
          </p>

          <Button href="/build-your-clean" className="mt-6 w-full">
            Start Building My Clean
          </Button>
          <Button href="/instant-estimate" variant="quiet" className="mt-3 w-full">
            Or see a price breakdown first
          </Button>
        </div>
      </aside>
    </div>
  );
}
