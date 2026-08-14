"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/time";
import type { SlotView } from "@/lib/types";

/**
 * A bookable time. These are the most-tapped control in the product, so they
 * are large, high-contrast, and carry their own price signal when discounted.
 */
export function SlotPill({
  slot,
  onSelect,
  selected,
  size = "md",
  showDeal = true,
  disabled,
}: {
  slot: SlotView;
  onSelect?: (slot: SlotView) => void;
  selected?: boolean;
  size?: "sm" | "md";
  showDeal?: boolean;
  disabled?: boolean;
}) {
  const deal = showDeal && slot.discount_pct > 0;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${formatTime(slot.slot.start_time)}${deal ? `, ${slot.discount_pct}% off` : ""}`}
      onClick={() => onSelect?.(slot)}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-xl border font-semibold tabular-nums transition-all duration-150 active:scale-[0.97] disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-[12.5px]" : "px-3 py-2 text-[13.5px]",
        selected
          ? "border-brand-500 bg-brand-500 text-white shadow-[0_2px_8px_rgba(108,77,255,0.32)]"
          : deal
            ? "border-urgent-100 bg-urgent-50 text-urgent-700 hover:border-urgent-500"
            : "border-line bg-surface text-ink hover:border-brand-400 hover:bg-brand-50/70",
      )}
    >
      {formatTime(slot.slot.start_time)}
      {deal && (
        <span
          className={cn(
            "absolute -right-1 -top-1.5 rounded-full px-1.5 py-px text-[9.5px] font-bold leading-[14px]",
            selected ? "bg-white text-brand-600" : "bg-urgent-500 text-white",
          )}
        >
          -{slot.discount_pct}%
        </span>
      )}
    </button>
  );
}

/** Horizontal, snap-scrolling rail of times. */
export function SlotRail({
  slots,
  onSelect,
  selectedId,
  max = 6,
  className,
}: {
  slots: SlotView[];
  onSelect?: (slot: SlotView) => void;
  selectedId?: string | null;
  max?: number;
  className?: string;
}) {
  const shown = slots.slice(0, max);
  return (
    <div className={cn("no-scrollbar snap-rail -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {shown.map((s) => (
        <span key={s.slot.id} className="snap-item">
          <SlotPill slot={s} onSelect={onSelect} selected={selectedId === s.slot.id} />
        </span>
      ))}
    </div>
  );
}
