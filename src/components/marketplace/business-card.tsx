"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { Badge, LiveDot, Rating } from "@/components/ui/primitives";
import { Media } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { SlotRail } from "./slot-pill";
import { formatCents } from "@/lib/pricing";
import { formatDistance } from "@/lib/geo";
import { dayLabel, formatTime } from "@/lib/time";
import type { BusinessView, SlotView } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The core marketplace card. Four attributes are always visible without a tap:
 * time, price, distance and rating — the four things people actually decide on.
 */
export function BusinessCard({
  view,
  now,
  isFavorite,
  onToggleFavorite,
  onSelectSlot,
  compact,
}: {
  view: BusinessView;
  now: Date;
  isFavorite?: boolean;
  onToggleFavorite?: (businessId: string) => void;
  onSelectSlot?: (slot: SlotView) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const { business, category, next_slot: next, best_deal: deal } = view;
  const href = `/business/${business.slug}`;

  function handleSlot(slot: SlotView) {
    if (onSelectSlot) onSelectSlot(slot);
    else router.push(`/book/${slot.slot.id}`);
  }

  return (
    <article className="group rounded-2xl border border-line bg-surface shadow-card transition-[box-shadow,border-color] duration-200 hover:shadow-lift">
      <div className="flex gap-3.5 p-3.5">
        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden="true">
          <Media
            seed={business.media_seed}
            icon={category.icon}
            className={cn("h-[92px] w-[92px]", compact && "h-[72px] w-[72px]")}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 truncate text-[16px] font-semibold tracking-[-0.015em] text-ink">
                <Link href={href} className="truncate hover:text-brand-600">
                  {business.name}
                </Link>
                {business.verification_status === "verified" && (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-brand-500"
                    aria-label="Verified business"
                  />
                )}
              </h3>
              <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                {category.name} · {business.neighborhood}
              </p>
            </div>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(business.id)}
                aria-label={isFavorite ? `Remove ${business.name} from favourites` : `Save ${business.name}`}
                aria-pressed={isFavorite}
                className="tap-target -mr-1.5 -mt-1.5 flex items-center justify-center rounded-full transition hover:bg-sunken"
              >
                <Heart
                  className={cn(
                    "h-[18px] w-[18px] transition",
                    isFavorite ? "fill-urgent-500 text-urgent-500" : "text-ink-muted",
                  )}
                />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Rating value={business.rating} count={business.review_count} />
            <span className="inline-flex items-center gap-1 text-[13px] text-ink-muted">
              <MapPin className="h-3.5 w-3.5" />
              {formatDistance(view.distance_miles)}
            </span>
            <span className="text-[13px] font-semibold text-ink">
              from {formatCents(view.from_price_cents, { showCents: false })}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {next && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live-50 px-2.5 py-1 text-[12px] font-semibold text-live-700">
                <LiveDot />
                {dayLabel(next.slot.date, now)} · {formatTime(next.slot.start_time)}
              </span>
            )}
            {deal && (
              <Badge tone="urgent">{deal.discount_pct}% off · {formatCents(deal.price_cents)}</Badge>
            )}
            {!view.is_open_now && !next && <Badge tone="neutral">Closed now</Badge>}
          </div>
        </div>
      </div>

      {view.upcoming_slots.length > 0 && (
        <div className="border-t border-line-soft px-3.5 py-3">
          <SlotRail slots={view.upcoming_slots} onSelect={handleSlot} max={compact ? 3 : 5} />
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-ink-muted">
              {view.slot_count} {view.slot_count === 1 ? "opening" : "openings"} available
            </p>
            <Link
              href={href}
              className="text-[13px] font-semibold text-brand-600 transition hover:text-brand-700"
            >
              See all times
            </Link>
          </div>
        </div>
      )}

      {view.upcoming_slots.length === 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-line-soft px-3.5 py-3">
          <p className="text-[13px] text-ink-muted">No online openings right now</p>
          <Button size="sm" variant="outline" onClick={() => router.push(href)}>
            View profile
          </Button>
        </div>
      )}
    </article>
  );
}
