"use client";

import { useMemo } from "react";
import { BusinessCard } from "@/components/marketplace/business-card";
import { LiveDot, Skeleton } from "@/components/ui/primitives";
import { useDiscovery, useFavorites } from "@/lib/hooks";
import { EMPTY_FILTERS, filterSlots, groupIntoBusinessViews } from "@/lib/store/selectors";

/**
 * Live availability strip for the public SEO category pages.
 *
 * The page around it is fully server-rendered for crawlers; this component
 * layers the current openings on top once the marketplace runtime is ready.
 */
export function CategoryLiveAvailability({ categorySlug }: { categorySlug: string }) {
  const discovery = useDiscovery();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const views = useMemo(() => {
    if (!discovery) return [];
    const filters = { ...EMPTY_FILTERS, categorySlug, sort: "soonest" as const };
    const matched = filterSlots(discovery.slots, filters, discovery.state);
    return groupIntoBusinessViews(matched, discovery.state, filters).slice(0, 4);
  }, [discovery, categorySlug]);

  if (!discovery) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[168px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (views.length === 0) return null;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.03em] text-ink">
        <LiveDot />
        Available in the next few days
      </h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {views.map((view) => (
          <BusinessCard
            key={view.business.id}
            view={view}
            now={discovery.now}
            isFavorite={favoriteIds.has(view.business.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
