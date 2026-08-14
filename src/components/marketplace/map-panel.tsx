"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Navigation, X } from "lucide-react";
import { Badge, Rating } from "@/components/ui/primitives";
import { Media } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { boundsFor, formatDistance, project, type LatLng } from "@/lib/geo";
import { formatCents } from "@/lib/pricing";
import { dayLabel, formatTime } from "@/lib/time";
import type { BusinessView } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Map view.
 *
 * The projection, pin layout and selection behaviour are all here and depend
 * only on lat/lng — so replacing the painted canvas with Mapbox or Google Maps
 * is a swap of the backdrop element, not a rewrite of the feature. Pins carry
 * price and availability because that's what people scan a map for.
 */
export function MapPanel({
  views,
  origin,
  now,
  className,
}: {
  views: BusinessView[];
  origin: LatLng;
  now: Date;
  className?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bounds = useMemo(
    () => boundsFor([origin, ...views.map((v) => ({ lat: v.business.lat, lng: v.business.lng }))]),
    [views, origin],
  );

  const selected = views.find((v) => v.business.id === selectedId) ?? null;
  const originPoint = project(origin, bounds);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-sunken",
        className,
      )}
    >
      {/* Painted basemap: a calm street-grid stand-in, not a fake screenshot. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#F4F3EF",
          backgroundImage: `
            linear-gradient(rgba(22,22,42,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,22,42,0.045) 1px, transparent 1px),
            linear-gradient(rgba(22,22,42,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,22,42,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px, 28px 28px, 140px 140px, 140px 140px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 10%, rgba(108,77,255,0.07), transparent 60%), radial-gradient(90% 80% at 90% 90%, rgba(15,159,90,0.06), transparent 55%)",
        }}
      />

      {/* Origin */}
      <span
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${originPoint.x * 100}%`, top: `${originPoint.y * 100}%` }}
      >
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500/30" />
          <span className="relative m-auto h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
        </span>
      </span>

      {/* Pins */}
      {views.map((view) => {
        const p = project({ lat: view.business.lat, lng: view.business.lng }, bounds);
        const active = view.business.id === selectedId;
        const price = view.next_slot?.price_cents ?? view.from_price_cents;
        const deal = Boolean(view.best_deal);
        return (
          <button
            key={view.business.id}
            type="button"
            onClick={() => setSelectedId(active ? null : view.business.id)}
            aria-label={`${view.business.name}, from ${formatCents(price, { showCents: false })}`}
            className={cn(
              "absolute z-20 -translate-x-1/2 -translate-y-full rounded-full border px-2.5 py-1 text-[12px] font-bold shadow-[0_2px_8px_rgba(22,22,42,0.18)] transition-all duration-150",
              active
                ? "z-30 scale-110 border-ink bg-ink text-white"
                : deal
                  ? "border-urgent-500 bg-urgent-500 text-white hover:scale-105"
                  : "border-line bg-surface text-ink hover:scale-105",
            )}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            {formatCents(price, { showCents: false })}
          </button>
        );
      })}

      {/* Controls */}
      <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
        <span className="rounded-xl border border-line bg-surface/95 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-muted shadow-card">
          <Layers className="mr-1 inline h-3.5 w-3.5" />
          Map preview
        </span>
      </div>

      {/* Selected business card */}
      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-40">
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-pop">
            <Media
              seed={selected.business.media_seed}
              icon={selected.category.icon}
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/business/${selected.business.slug}`}
                  className="truncate text-[14.5px] font-semibold text-ink hover:text-brand-600"
                >
                  {selected.business.name}
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className="-mr-1 -mt-1 rounded-full p-1 text-ink-muted hover:bg-sunken"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
                <Rating value={selected.business.rating} count={selected.business.review_count} />
                <span className="inline-flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {formatDistance(selected.distance_miles)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-ink">
                  {selected.next_slot
                    ? `Next ${dayLabel(selected.next_slot.slot.date, now)} · ${formatTime(selected.next_slot.slot.start_time)}`
                    : "No online openings"}
                </p>
                {selected.best_deal && <Badge tone="urgent">{selected.best_deal.discount_pct}% off</Badge>}
              </div>
              {selected.next_slot && (
                <Button
                  size="sm"
                  className="mt-2.5"
                  fullWidth
                  onClick={() => router.push(`/book/${selected.next_slot!.slot.id}`)}
                >
                  Book {formatTime(selected.next_slot.slot.start_time)} ·{" "}
                  {formatCents(selected.next_slot.price_cents)}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {views.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 text-center">
          <p className="max-w-xs rounded-2xl bg-surface/95 px-4 py-3 text-[13.5px] text-ink-muted shadow-card">
            No openings inside this area yet. Widen your filters to see more.
          </p>
        </div>
      )}
    </div>
  );
}
