"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, LiveDot, Skeleton } from "@/components/ui/primitives";
import { SlotPill } from "@/components/marketplace/slot-pill";
import { useDiscovery } from "@/lib/hooks";
import { formatCents } from "@/lib/pricing";
import { DAY_ABBR, addDays, dayLabel, formatDuration, parseDateOnly, toDateOnly } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { SlotView } from "@/lib/types";

const HORIZON = 7;

/**
 * The live half of a business profile: real openings, grouped by day and
 * service. Rendered client-side because availability is generated against the
 * current clock.
 */
export function BusinessAvailability({
  businessId,
  serviceId,
  compact,
}: {
  businessId: string;
  /** Restrict to a single service (used inside the services list). */
  serviceId?: string;
  compact?: boolean;
}) {
  const discovery = useDiscovery();
  const router = useRouter();
  const [dayOffset, setDayOffset] = useState(0);

  const slots = useMemo(() => {
    if (!discovery) return [];
    return discovery.slots.filter(
      (s) => s.business.id === businessId && (!serviceId || s.service.id === serviceId),
    );
  }, [discovery, businessId, serviceId]);

  if (!discovery) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
      </div>
    );
  }

  const today = toDateOnly(discovery.now);
  const days = Array.from({ length: HORIZON }, (_, i) => addDays(today, i));
  const countsByDay = new Map(days.map((d) => [d, slots.filter((s) => s.slot.date === d).length]));
  const activeDate = days[dayOffset];
  const dayySlots = slots
    .filter((s) => s.slot.date === activeDate)
    .sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));

  function book(slot: SlotView) {
    router.push(`/book/${slot.slot.id}`);
  }

  if (compact) {
    const next = dayySlots.length ? dayySlots : slots.slice(0, 6);
    if (next.length === 0) {
      return <p className="text-[13px] text-ink-muted">No online openings in the next 7 days.</p>;
    }
    return (
      <div className="no-scrollbar snap-rail flex gap-2 overflow-x-auto py-0.5">
        {next.slice(0, 6).map((s) => (
          <span key={s.slot.id} className="snap-item">
            <SlotPill slot={s} size="sm" onSelect={book} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[15.5px] font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-brand-500" />
          Available times
        </h3>
        {slots.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-live-700">
            <LiveDot />
            {slots.length} open
          </span>
        )}
      </div>

      <div className="no-scrollbar snap-rail -mx-1 mt-3.5 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((date, i) => {
          const count = countsByDay.get(date) ?? 0;
          const active = i === dayOffset;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setDayOffset(i)}
              aria-pressed={active}
              className={cn(
                "snap-item flex min-w-[70px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition",
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : count > 0
                    ? "border-line bg-surface text-ink hover:border-brand-300"
                    : "border-line-soft bg-sunken/60 text-ink-muted",
              )}
            >
              <span className="text-[12px] font-semibold">{shortDay(date, discovery.now)}</span>
              <span className={cn("mt-0.5 text-[11px]", active ? "text-white/80" : "text-ink-muted")}>
                {count > 0 ? `${count} open` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {dayySlots.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent py-6"
            title="Nothing open on this day"
            body="Try another day above, or message the business to ask about waitlists."
          />
        ) : (
          <div className="space-y-4">
            {groupByService(dayySlots).map(([serviceName, list]) => (
              <div key={serviceName}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-[13.5px] font-semibold text-ink">{serviceName}</p>
                  <p className="text-[12.5px] text-ink-muted">
                    {formatDuration(list[0].service.duration_minutes)} ·{" "}
                    {list.some((s) => s.discount_pct > 0) ? (
                      <span className="font-semibold text-urgent-600">
                        from {formatCents(Math.min(...list.map((s) => s.price_cents)))}
                      </span>
                    ) : (
                      formatCents(list[0].price_cents)
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <SlotPill key={s.slot.id} slot={s} onSelect={book} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {slots.some((s) => s.discount_pct > 0) && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-urgent-50 px-3 py-2.5">
          <Badge tone="urgent">Deal</Badge>
          <p className="text-[12.5px] text-urgent-700">
            Some of these are last-minute openings at a reduced price.
          </p>
        </div>
      )}
    </div>
  );
}

/** Sticky mobile CTA that jumps to the soonest opening. */
export function BookSoonestBar({ businessId }: { businessId: string }) {
  const discovery = useDiscovery();
  const router = useRouter();
  const next = discovery?.slots.find((s) => s.business.id === businessId) ?? null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] z-40 border-y border-line bg-surface/95 px-4 py-3 backdrop-blur-xl sm:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {next ? (
            <>
              <p className="truncate text-[13px] font-semibold text-ink">
                Soonest · {dayLabel(next.slot.date, discovery!.now)} at{" "}
                {next.slot.start_time.replace(/^0/, "")}
              </p>
              <p className="truncate text-[12px] text-ink-muted">
                {next.service.name} · {formatCents(next.price_cents)}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-ink-muted">No online openings right now</p>
          )}
        </div>
        <Button
          onClick={() => (next ? router.push(`/book/${next.slot.id}`) : router.push("/search"))}
          trailing={<ChevronRight className="h-4 w-4" />}
        >
          {next ? "Book" : "Find alternatives"}
        </Button>
      </div>
    </div>
  );
}

/** "Today" · "Tomorrow" · "Sat 23" */
function shortDay(date: string, now: Date): string {
  const label = dayLabel(date, now);
  if (label === "Today" || label === "Tomorrow") return label;
  const d = parseDateOnly(date);
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()}`;
}

function groupByService(slots: SlotView[]): Array<[string, SlotView[]]> {
  const map = new Map<string, SlotView[]>();
  for (const s of slots) {
    const list = map.get(s.service.name) ?? [];
    list.push(s);
    map.set(s.service.name, list);
  }
  return [...map.entries()];
}
