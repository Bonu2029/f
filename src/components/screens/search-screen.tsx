"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Map as MapIcon, SlidersHorizontal, Sparkles } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SearchBar } from "@/components/marketplace/search-bar";
import { BusinessCard } from "@/components/marketplace/business-card";
import { MapPanel } from "@/components/marketplace/map-panel";
import { Button } from "@/components/ui/button";
import { Chip, Field, Segmented, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, SkeletonCard } from "@/components/ui/primitives";
import { useFavorites, useSearchResults } from "@/lib/hooks";
import { useMarketplace } from "@/lib/store";
import { EMPTY_FILTERS, type Availability, type SearchFilters, type SortKey } from "@/lib/store/selectors";
import { AVAILABILITY_LABELS, SORT_LABELS, parseQuery } from "@/lib/search";
import { categoryBySlug } from "@/lib/data/categories";
import { addDays, formatTime, minutesToTime, toDateOnly } from "@/lib/time";
import { formatCents } from "@/lib/pricing";
import { SEARCH_RADIUS_OPTIONS } from "@/lib/config";

const QUICK: { value: Availability; label: string }[] = [
  { value: "now", label: "Available now" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
];

export function SearchScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { location } = useMarketplace();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const q = params.get("q") ?? "";
  const categoryParam = params.get("category");

  const [overrides, setOverrides] = useState<Partial<SearchFilters>>({});
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Query understanding runs first; explicit UI controls override it.
  const parsed = useMemo(
    () => parseQuery(q, categoryParam ? { categorySlug: categoryParam } : {}),
    [q, categoryParam],
  );

  const filters: SearchFilters = useMemo(
    () => ({ ...EMPTY_FILTERS, ...parsed.filters, ...overrides }),
    [parsed.filters, overrides],
  );

  const results = useSearchResults(filters);
  const category = filters.categorySlug ? categoryBySlug(filters.categorySlug) : null;

  const heading = category
    ? `${category.plural_name} near ${location.label.split(",")[0]}`
    : q
      ? `"${q}" near ${location.label.split(",")[0]}`
      : `Available near ${location.label.split(",")[0]}`;

  const activeFilterCount =
    (filters.maxPriceCents ? 1 : 0) +
    (filters.maxDistanceMiles ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.timeFrom != null || filters.timeTo != null ? 1 : 0) +
    (filters.date ? 1 : 0);

  function patch(next: Partial<SearchFilters>) {
    setOverrides((prev) => ({ ...prev, ...next }));
  }

  return (
    <CustomerShell>
      <div className="pt-4">
        <SearchBar defaultValue={q} size="md" className="max-w-2xl" />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-ink sm:text-[26px]">
            {heading}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">
            {!results
              ? "Finding live openings…"
              : `${results.businesses.length} ${results.businesses.length === 1 ? "business" : "businesses"} · ${results.matchedSlots.length} open ${results.matchedSlots.length === 1 ? "time" : "times"}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sort">Sort results</label>
          <Select
            id="sort"
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as SortKey })}
            className="h-9 w-[150px] text-[13.5px]"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </Select>
          <Segmented
            ariaLabel="Result view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
              { value: "map", label: "Map", icon: <MapIcon className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>
      </div>

      {/* ---- Filter rail --------------------------------------------------- */}
      <div className="no-scrollbar sticky top-14 z-30 -mx-4 mt-3 flex gap-2 overflow-x-auto bg-canvas/90 px-4 py-2.5 backdrop-blur-md sm:top-16 sm:mx-0 sm:px-0">
        <Chip
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          active={activeFilterCount > 0}
          onClick={() => setFiltersOpen(true)}
          count={activeFilterCount}
        >
          Filters
        </Chip>
        {QUICK.map((opt) => (
          <Chip
            key={opt.value}
            active={filters.availability === opt.value}
            onClick={() =>
              patch({ availability: filters.availability === opt.value ? "any" : opt.value, date: null })
            }
          >
            {opt.label}
          </Chip>
        ))}
        <Chip active={filters.dealsOnly} onClick={() => patch({ dealsOnly: !filters.dealsOnly })}>
          Deals
        </Chip>
        <Chip
          active={filters.minRating != null}
          onClick={() => patch({ minRating: filters.minRating ? null : 4.5 })}
        >
          4.5+ rated
        </Chip>
        <Chip
          active={filters.maxDistanceMiles != null}
          onClick={() => patch({ maxDistanceMiles: filters.maxDistanceMiles ? null : 3 })}
        >
          Within 3 mi
        </Chip>
      </div>

      {/* ---- Results ------------------------------------------------------- */}
      <div className="mt-3">
        {!results ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : results.businesses.length === 0 ? (
          <NoResults filters={filters} onPatch={patch} onReset={() => setOverrides({})} />
        ) : view === "map" ? (
          <MapPanel
            views={results.businesses}
            origin={results.origin}
            now={results.now}
            className="h-[62vh] min-h-[420px]"
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {results.businesses.map((v) => (
              <BusinessCard
                key={v.business.id}
                view={v}
                now={results.now}
                isFavorite={favoriteIds.has(v.business.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onPatch={patch}
        onClear={() => setOverrides({})}
      />

      <div className="h-6" />
    </CustomerShell>
  );

  function NoResults({
    filters: current,
    onPatch,
    onReset,
  }: {
    filters: SearchFilters;
    onPatch: (next: Partial<SearchFilters>) => void;
    onReset: () => void;
  }) {
    // Never dead-end: always offer the next-best thing that will have results.
    const suggestions: { label: string; apply: () => void }[] = [];
    if (current.availability === "now") {
      suggestions.push({ label: "Anything today", apply: () => onPatch({ availability: "today" }) });
    }
    if (current.availability !== "tomorrow") {
      suggestions.push({ label: "Try tomorrow", apply: () => onPatch({ availability: "tomorrow" }) });
    }
    if (current.maxDistanceMiles != null) {
      suggestions.push({
        label: `Widen to ${Math.min(25, (current.maxDistanceMiles ?? 3) * 2)} miles`,
        apply: () => onPatch({ maxDistanceMiles: Math.min(25, (current.maxDistanceMiles ?? 3) * 2) }),
      });
    }
    if (current.dealsOnly) {
      suggestions.push({ label: "Include full-price times", apply: () => onPatch({ dealsOnly: false }) });
    }
    if (current.maxPriceCents) {
      suggestions.push({ label: "Remove price cap", apply: () => onPatch({ maxPriceCents: null }) });
    }
    suggestions.push({ label: "Clear all filters", apply: onReset });

    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title="Nothing available at that exact time"
        body="Here are the closest ways to still get seen today or tomorrow."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 4).map((s) => (
              <Button key={s.label} size="sm" variant="outline" onClick={s.apply}>
                {s.label}
              </Button>
            ))}
            <Button size="sm" onClick={() => router.push("/deals")}>
              See last-minute deals
            </Button>
          </div>
        }
      />
    );
  }
}

function FiltersSheet({
  open,
  onClose,
  filters,
  onPatch,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onPatch: (next: Partial<SearchFilters>) => void;
  onClear: () => void;
}) {
  const today = toDateOnly(new Date());
  const priceOptions = [3000, 5000, 7500, 10000, 15000];
  const timeOptions = [null, 8 * 60, 12 * 60, 15 * 60, 17 * 60, 19 * 60];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      description="Narrow to what actually works for you."
      footer={
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onClear}>
            Clear all
          </Button>
          <Button fullWidth onClick={onClose}>
            Show results
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="When">
          <div className="flex flex-wrap gap-2">
            {(["any", "now", "today", "tomorrow"] as Availability[]).map((a) => (
              <Chip
                key={a}
                active={filters.availability === a}
                onClick={() => onPatch({ availability: a, date: null })}
              >
                {AVAILABILITY_LABELS[a]}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Specific date" htmlFor="filter-date">
          <input
            id="filter-date"
            type="date"
            min={today}
            max={addDays(today, 6)}
            value={filters.date ?? ""}
            onChange={(e) =>
              onPatch({ date: e.target.value || null, availability: e.target.value ? "date" : "any" })
            }
            className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
          />
        </Field>

        <Field label="Earliest start">
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((t) => (
              <Chip key={t ?? "any"} active={filters.timeFrom === t} onClick={() => onPatch({ timeFrom: t })}>
                {t == null ? "Any" : formatTime(minutesToTime(t))}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Max price">
          <div className="flex flex-wrap gap-2">
            <Chip active={filters.maxPriceCents == null} onClick={() => onPatch({ maxPriceCents: null })}>
              Any
            </Chip>
            {priceOptions.map((p) => (
              <Chip key={p} active={filters.maxPriceCents === p} onClick={() => onPatch({ maxPriceCents: p })}>
                Under {formatCents(p, { showCents: false })}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Distance">
          <div className="flex flex-wrap gap-2">
            <Chip
              active={filters.maxDistanceMiles == null}
              onClick={() => onPatch({ maxDistanceMiles: null })}
            >
              Any
            </Chip>
            {SEARCH_RADIUS_OPTIONS.map((r) => (
              <Chip
                key={r}
                active={filters.maxDistanceMiles === r}
                onClick={() => onPatch({ maxDistanceMiles: r })}
              >
                {r} mi
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Rating">
          <div className="flex flex-wrap gap-2">
            {[null, 4, 4.5, 4.8].map((r) => (
              <Chip key={r ?? "any"} active={filters.minRating === r} onClick={() => onPatch({ minRating: r })}>
                {r == null ? "Any" : `${r}+`}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Offers">
          <Chip active={filters.dealsOnly} onClick={() => onPatch({ dealsOnly: !filters.dealsOnly })}>
            Last-minute deals only
          </Chip>
        </Field>
      </div>
    </Modal>
  );
}
