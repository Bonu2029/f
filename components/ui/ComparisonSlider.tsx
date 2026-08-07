'use client';

import { useId, useState } from 'react';
import { EditorialImage } from './EditorialImage';
import { getImage } from '@/lib/content/images';
import { cn } from '@/lib/utils';

/**
 * Draggable before/after comparison. The full-bleed range input gives pointer
 * dragging and arrow-key control from the same accessible control, so keyboard
 * users are not handed a second, different interface.
 */
export function ComparisonSlider({
  imageId,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
  aspect = 'aspect-[16/10]',
  caption,
}: {
  imageId: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspect?: string;
  caption?: string;
}) {
  const [position, setPosition] = useState(52);
  const id = useId();
  const slot = getImage(imageId);
  /** With only one frame available, the before state has to be simulated. */
  const simulated = !slot?.beforeSrc;

  return (
    <figure className={cn('w-full', className)}>
      <div className={cn('relative overflow-hidden rounded-3xl border border-line', aspect)}>
        {/* After state */}
        <EditorialImage
          id={imageId}
          aspect="absolute inset-0 h-full w-full"
          rounded="rounded-none"
          showLabel={false}
          className="border-0"
        />

        {/* Before state. The layer stays full size and is revealed with a
            clip-path, so both frames keep the same scale and stay registered
            with each other however far the handle travels. Constraining this
            layer's width instead would squeeze the before image as it moves. */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          aria-hidden="true"
        >
          <EditorialImage
            id={imageId}
            variant="before"
            aspect="absolute inset-0 h-full w-full"
            rounded="rounded-none"
            showLabel={false}
            className={cn('border-0', simulated && 'saturate-[0.55] brightness-[0.94]')}
          />
          {simulated ? <div className="absolute inset-0 bg-ink/[0.07]" /> : null}
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {beforeLabel}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {afterLabel}
        </span>

        {/* Handle */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_0_1px_rgba(57,68,63,0.12)]"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white shadow-lift">
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
              <path
                d="M6 1 1 6l5 5M12 1l5 5-5 5"
                fill="none"
                stroke="#5F8F7B"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {/* Dragging cannot convey the comparison to a screen reader, so both
            states are described in text rather than left to the visuals. */}
        {slot?.beforeAlt ? (
          <p className="sr-only">
            {`Before: ${slot.beforeAlt}. After: ${slot.alt}.`}
          </p>
        ) : null}

        <label htmlFor={id} className="sr-only">
          {`Reveal the cleaned result${slot ? ` — ${slot.label}` : ''}`}
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-valuetext={`${position}% before, ${100 - position}% after`}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />

        <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[11px] text-muted backdrop-blur-sm">
          Drag or use arrow keys
        </span>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
