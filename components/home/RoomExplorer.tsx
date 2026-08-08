'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { rooms, type RoomId } from '@/lib/content/rooms';
import { cn } from '@/lib/utils';

/**
 * An illustrated plan rather than a photo. Each room is a real button, so the
 * whole thing is keyboard-navigable and announced properly.
 */
export function RoomExplorer() {
  const [activeId, setActiveId] = useState<RoomId>('kitchen');
  const reduce = useReducedMotion();
  const active = rooms.find((room) => room.id === activeId)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
      <div className="rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-6">
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(4, minmax(76px, auto))',
          }}
        >
          {rooms.map((room) => {
            const isActive = room.id === activeId;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveId(room.id)}
                onMouseEnter={() => setActiveId(room.id)}
                onFocus={() => setActiveId(room.id)}
                aria-pressed={isActive}
                style={{
                  gridColumn: `${room.plan.col} / span ${room.plan.span}`,
                  gridRow: `${room.plan.row} / span ${room.plan.rowSpan}`,
                }}
                className={cn(
                  'group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-300 ease-luma',
                  isActive
                    ? 'border-accent bg-mint/40 shadow-soft'
                    : 'border-line bg-pearl/45 hover:border-sage hover:bg-mint/20',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-accent text-white' : 'bg-white text-accent',
                  )}
                  aria-hidden="true"
                >
                  <Icon name={roomIcon(room.id)} size={16} />
                </span>
                <span className="mt-3 block text-[13px] font-medium leading-tight text-ink sm:text-sm">
                  {room.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">
          Illustrated layout — your real plan is built from your own rooms in Build
          Your Clean.
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-luma-gradient p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Included in this room</p>
            <h3 className="mt-2 font-display text-2xl text-ink">{active.label}</h3>
            <p className="mt-2 text-sm text-muted">{active.blurb}</p>
            <ul className="mt-5 space-y-2.5">
              {active.includes.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] text-ink/85">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <Icon name="clock" size={16} className="text-accent" />
              Typical time in this room: about {active.baseMinutes} minutes
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function roomIcon(id: RoomId) {
  const map: Record<RoomId, string> = {
    kitchen: 'oven',
    bathroom: 'droplet',
    bedroom: 'linen',
    living: 'home',
    dining: 'star',
    office: 'document',
    entry: 'key',
    laundry: 'laundry',
    basement: 'cabinet',
    balcony: 'balcony',
  };
  return map[id];
}
