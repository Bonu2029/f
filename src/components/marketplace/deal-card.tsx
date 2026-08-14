"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Timer } from "lucide-react";
import { Badge, Rating } from "@/components/ui/primitives";
import { Media } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatDistance } from "@/lib/geo";
import { dayLabel, formatTime, relativeFromMinutes } from "@/lib/time";
import type { SlotView } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Last-minute opening. Urgency is carried by structure — a real discount, a
 * real countdown, a real remaining count — rather than by shouting, so the card
 * reads as useful rather than spammy.
 */
export function DealCard({
  slot,
  remaining,
  variant = "rail",
}: {
  slot: SlotView;
  remaining: number;
  variant?: "rail" | "list";
}) {
  const router = useRouter();
  const now = new Date();
  const soon = slot.minutes_until <= 180;
  const href = `/book/${slot.slot.id}`;

  if (variant === "list") {
    return (
      <article className="flex gap-3.5 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition hover:shadow-lift">
        <div className="relative shrink-0">
          <Media seed={slot.business.media_seed} icon={slot.category.icon} className="h-[96px] w-[96px]" />
          {slot.discount_pct > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-lg bg-urgent-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              {slot.discount_pct}% OFF
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-semibold tracking-[-0.015em] text-ink">
            {slot.service.name}
          </p>
          <Link
            href={`/business/${slot.business.slug}`}
            className="truncate text-[13px] font-medium text-ink-soft hover:text-brand-600"
          >
            {slot.business.name}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Clock className="h-3.5 w-3.5 text-brand-500" />
              {dayLabel(slot.slot.date, now)} · {formatTime(slot.slot.start_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {formatDistance(slot.distance_miles)}
            </span>
            <Rating value={slot.business.rating} />
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div>
              <PriceBlock slot={slot} />
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {remaining === 1 ? "Only 1 slot left" : `${remaining} slots left`}
              </p>
            </div>
            <Button size="sm" variant={soon ? "urgent" : "primary"} onClick={() => router.push(href)}>
              Book now
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex w-[266px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:shadow-lift">
      <div className="relative">
        <Media
          seed={slot.business.media_seed}
          icon={slot.category.icon}
          rounded="rounded-none"
          className="h-[104px] w-full"
        />
        {slot.discount_pct > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-urgent-500 px-2 py-1 text-[11.5px] font-bold tracking-wide text-white shadow-sm">
            {slot.discount_pct}% OFF
          </span>
        )}
        <span
          className={cn(
            "absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
            soon ? "bg-ink/85 text-white" : "bg-surface/90 text-ink-soft",
          )}
        >
          <Timer className="h-3 w-3" />
          {relativeFromMinutes(slot.minutes_until)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-ink">
          {slot.business.name}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">{slot.service.name}</p>

        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Clock className="h-3.5 w-3.5 text-brand-500" />
          {dayLabel(slot.slot.date, now)} · {formatTime(slot.slot.start_time)}
        </p>

        <div className="mt-1.5 flex items-center gap-2.5 text-[12.5px] text-ink-muted">
          <Rating value={slot.business.rating} />
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {formatDistance(slot.distance_miles)}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 pt-1">
          <PriceBlock slot={slot} />
          {remaining <= 2 && (
            <Badge tone="urgent">{remaining === 1 ? "1 slot" : `${remaining} slots`}</Badge>
          )}
        </div>

        <Button
          className="mt-3"
          size="sm"
          fullWidth
          variant={soon ? "urgent" : "primary"}
          onClick={() => router.push(href)}
        >
          Book now
        </Button>
      </div>
    </article>
  );
}

function PriceBlock({ slot }: { slot: SlotView }) {
  if (slot.discount_pct <= 0) {
    return <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{formatCents(slot.price_cents)}</p>;
  }
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="text-[13px] text-ink-muted line-through">
        {formatCents(slot.slot.original_price_cents, { showCents: false })}
      </span>
      <span className="text-[19px] font-semibold tracking-[-0.02em] text-urgent-600">
        {formatCents(slot.price_cents)}
      </span>
    </p>
  );
}
