'use client';

import { Icon } from '@/components/ui/Icon';
import { roomIcon } from '@/components/home/RoomExplorer';
import { rooms, type RoomId } from '@/lib/content/rooms';
import { cn } from '@/lib/utils';

/** Multi-select floor plan used by the plan builder and the booking flow. */
export function RoomSelector({
  selected,
  onToggle,
}: {
  selected: RoomId[];
  onToggle: (id: RoomId) => void;
}) {
  return (
    <div>
      <div
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gridAutoRows: 'minmax(84px, auto)',
        }}
      >
        {rooms.map((room) => {
          const isOn = selected.includes(room.id);
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onToggle(room.id)}
              aria-pressed={isOn}
              style={{
                gridColumn: `${room.plan.col} / span ${room.plan.span}`,
                gridRow: `${room.plan.row} / span ${room.plan.rowSpan}`,
              }}
              className={cn(
                'group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-300 ease-luma',
                isOn
                  ? 'border-accent bg-mint/45 shadow-soft'
                  : 'border-dashed border-line bg-pearl/35 hover:border-sage hover:bg-mint/15',
              )}
            >
              <span className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    isOn ? 'bg-accent text-white' : 'bg-white text-accent',
                  )}
                  aria-hidden="true"
                >
                  <Icon name={roomIcon(room.id)} size={15} />
                </span>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors',
                    isOn ? 'border-accent bg-accent text-white' : 'border-line bg-white text-muted',
                  )}
                  aria-hidden="true"
                >
                  {isOn ? (
                    <svg width="9" height="7" viewBox="0 0 10 8">
                      <path
                        d="M1 4.2 3.4 6.6 9 1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    '+'
                  )}
                </span>
              </span>
              <span className="mt-2 block text-[13px] font-medium leading-tight text-ink sm:text-sm">
                {room.label}
              </span>
              <span className="text-[11px] text-muted">{room.baseMinutes} min</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {selected.length} {selected.length === 1 ? 'room' : 'rooms'} included. Tap a
        room to add or remove it.
      </p>
    </div>
  );
}
