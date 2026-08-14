"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { DealCard } from "@/components/marketplace/deal-card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/form";
import { EmptyState, LiveDot, Skeleton } from "@/components/ui/primitives";
import { useDeals, remainingForDeal } from "@/lib/hooks";
import { CATEGORIES } from "@/lib/data/categories";
import { toDateOnly, addDays } from "@/lib/time";

type Window = "all" | "now" | "today" | "tomorrow";

export function DealsScreen() {
  const data = useDeals(60);
  const [window, setWindow] = useState<Window>("all");
  const [category, setCategory] = useState<string | null>(null);

  const deals = (() => {
    if (!data) return [];
    const today = toDateOnly(data.now);
    return data.allDeals.filter((d) => {
      if (category && d.category.slug !== category && d.business.category_ids.every(
        (id) => data.state.categories.find((c) => c.id === id)?.slug !== category,
      )) return false;
      if (window === "now") return d.minutes_until <= 180;
      if (window === "today") return d.slot.date === today;
      if (window === "tomorrow") return d.slot.date === addDays(today, 1);
      return true;
    });
  })();

  const activeCategories = data
    ? CATEGORIES.filter((c) => data.allDeals.some((d) => d.category.slug === c.slug))
    : [];

  const totalSaving = deals.reduce(
    (sum, d) => sum + (d.slot.original_price_cents - d.price_cents),
    0,
  );

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.03em] text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-urgent-50 text-urgent-500">
            <Flame className="h-[18px] w-[18px]" />
          </span>
          Last-minute deals
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          {data ? (
            <span className="inline-flex items-center gap-1.5">
              <LiveDot />
              {deals.length} discounted {deals.length === 1 ? "opening" : "openings"} near you
              {totalSaving > 0 && ` · up to ${Math.max(...deals.map((d) => d.discount_pct))}% off`}
            </span>
          ) : (
            "Finding discounted openings…"
          )}
        </p>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(["all", "now", "today", "tomorrow"] as Window[]).map((w) => (
          <Chip key={w} active={window === w} onClick={() => setWindow(w)}>
            {w === "all" ? "All deals" : w === "now" ? "Next 3 hours" : w === "today" ? "Today" : "Tomorrow"}
          </Chip>
        ))}
      </div>

      {activeCategories.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Chip active={category == null} onClick={() => setCategory(null)}>
            Everything
          </Chip>
          {activeCategories.map((c) => (
            <Chip
              key={c.id}
              active={category === c.slug}
              onClick={() => setCategory(category === c.slug ? null : c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
        {!data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px] w-full rounded-2xl" />)
        ) : deals.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={<Flame className="h-5 w-5" />}
              title="No deals in this window"
              body="Businesses drop prices when a cancellation appears, so this list moves through the day. Try a wider window, or browse full availability."
              action={
                <div className="flex gap-2">
                  <ButtonLink href="/search" size="sm">
                    Browse availability
                  </ButtonLink>
                  <ButtonLink href="/favorites" size="sm" variant="outline">
                    Alert me for favourites
                  </ButtonLink>
                </div>
              }
            />
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.slot.id}
              slot={deal}
              remaining={remainingForDeal(data.slots, deal)}
              variant="list"
            />
          ))
        )}
      </div>

      <div className="h-6" />
    </CustomerShell>
  );
}
