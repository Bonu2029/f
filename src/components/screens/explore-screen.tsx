"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Compass, MapPin } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SearchBar } from "@/components/marketplace/search-bar";
import { CategoryRail } from "@/components/marketplace/category-rail";
import { BusinessCard } from "@/components/marketplace/business-card";
import { MapPanel } from "@/components/marketplace/map-panel";
import { Segmented } from "@/components/ui/form";
import { EmptyState, Section, SkeletonCard } from "@/components/ui/primitives";
import { useDiscovery, useFavorites } from "@/lib/hooks";
import { EMPTY_FILTERS, groupIntoBusinessViews } from "@/lib/store/selectors";
import { PHILADELPHIA } from "@/lib/data/cities";
import { SEARCH_EXAMPLES } from "@/lib/search";

export function ExploreScreen() {
  const discovery = useDiscovery();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [view, setView] = useState<"list" | "map">("list");

  const businesses = discovery
    ? groupIntoBusinessViews(discovery.slots, discovery.state, { ...EMPTY_FILTERS, sort: "nearest" })
    : [];

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink">Explore</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          Everything bookable around you in the next seven days.
        </p>
        <SearchBar size="md" className="mt-4 max-w-2xl" />
      </div>

      <Section className="mt-7" title="Browse by category">
        <CategoryRail variant="grid" />
      </Section>

      <Section className="mt-8" title="Popular searches">
        <div className="flex flex-wrap gap-2">
          {SEARCH_EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/search?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink-soft transition hover:border-brand-200 hover:text-ink"
            >
              {example}
            </Link>
          ))}
        </div>
      </Section>

      <Section className="mt-8" title="Neighbourhoods" subtitle="Philadelphia">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PHILADELPHIA.neighborhoods.map((n) => (
            <Link
              key={n}
              href={`/search?q=${encodeURIComponent(n)}`}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13.5px] font-medium text-ink transition hover:border-brand-200"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span className="truncate">{n}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        className="mt-8"
        title="All businesses with openings"
        subtitle={discovery ? `${businesses.length} nearby` : "Loading…"}
        action={
          <Segmented
            ariaLabel="View"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "map", label: "Map" },
            ]}
          />
        }
      >
        {!discovery ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-5 w-5" />}
            title="Nothing bookable in range"
            body="Widen your location radius to see more of the city."
          />
        ) : view === "map" ? (
          <MapPanel
            views={businesses}
            origin={discovery.origin}
            now={discovery.now}
            className="h-[62vh] min-h-[420px]"
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {businesses.map((v) => (
              <BusinessCard
                key={v.business.id}
                view={v}
                now={discovery.now}
                isFavorite={favoriteIds.has(v.business.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </Section>

      <Link
        href="/philadelphia"
        className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-200"
      >
        <span>
          <span className="block text-[15px] font-semibold text-ink">Browse Philadelphia by category</span>
          <span className="block text-[13px] text-ink-muted">Public pages for every service and neighbourhood</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
      </Link>

      <div className="h-6" />
    </CustomerShell>
  );
}
