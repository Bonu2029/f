"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, Flame, ShieldCheck, Sparkles, Store, X } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SearchBar } from "@/components/marketplace/search-bar";
import { CategoryRail } from "@/components/marketplace/category-rail";
import { DealCard } from "@/components/marketplace/deal-card";
import { BusinessCard } from "@/components/marketplace/business-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, LiveDot, Section, SkeletonCard, Skeleton } from "@/components/ui/primitives";
import { useDeals, useDiscovery, useFavorites, remainingForDeal } from "@/lib/hooks";
import { groupIntoBusinessViews, EMPTY_FILTERS } from "@/lib/store/selectors";
import { useMarketplace } from "@/lib/store";
import { BRAND } from "@/lib/config";

export function HomeScreen() {
  const discovery = useDiscovery();
  const dealData = useDeals(10);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { location, requestDeviceLocation } = useMarketplace();
  const [locationPromptOpen, setLocationPromptOpen] = useState(true);

  const nearby = discovery
    ? groupIntoBusinessViews(discovery.slots, discovery.state, {
        ...EMPTY_FILTERS,
        sort: "recommended",
      }).slice(0, 8)
    : [];

  return (
    <CustomerShell>
      {/* ---- Hero ------------------------------------------------------- */}
      <div className="pt-5 sm:pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg text-[27px] font-bold leading-[1.12] tracking-[-0.035em] text-ink sm:text-[38px]"
        >
          {BRAND.prompt}
        </motion.h1>
        <p className="mt-2 text-[14.5px] text-ink-muted sm:text-base">
          Real openings near {location.label.split(",")[0]} — book in a few taps.
        </p>

        <SearchBar className="mt-4 max-w-2xl" />

        {location.source === "default" && locationPromptOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand-100 bg-brand-50/70 px-3.5 py-2.5">
            <Crosshair className="h-4 w-4 shrink-0 text-brand-600" />
            <p className="min-w-0 flex-1 text-[13px] font-medium text-ink">
              Use your location to find appointments near you?
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="sm" onClick={() => requestDeviceLocation()}>
                Use my location
              </Button>
              <button
                type="button"
                onClick={() => setLocationPromptOpen(false)}
                aria-label="Dismiss — I'll enter my location manually"
                className="tap-target flex items-center justify-center rounded-full text-ink-muted hover:bg-brand-100 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Categories -------------------------------------------------- */}
      <div className="mt-6">
        <CategoryRail />
      </div>

      {/* ---- Openings right now ------------------------------------------ */}
      <Section
        className="mt-8"
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-urgent-50 text-urgent-500">
              <Flame className="h-4 w-4" />
            </span>
            Openings right now
          </span>
        }
        subtitle="Appointments businesses want to fill today — often at a discount."
        action={
          <Link
            href="/deals"
            className="hidden shrink-0 items-center gap-1 text-[13.5px] font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex"
          >
            See all deals
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {!dealData ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[300px] w-[266px] shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : dealData.deals.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No last-minute openings this second"
            body="Businesses publish cancellations throughout the day. Check the full availability below, or turn on alerts for your favourites."
            action={<ButtonLink href="/search" variant="outline" size="sm">Browse availability</ButtonLink>}
          />
        ) : (
          <div className="no-scrollbar snap-rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {dealData.deals.map((deal, i) => (
              <motion.div
                key={deal.slot.id}
                className="snap-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.24) }}
              >
                <DealCard slot={deal} remaining={remainingForDeal(dealData.slots, deal)} />
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ---- Available near you ------------------------------------------ */}
      <Section
        className="mt-9"
        title="Available near you"
        subtitle={
          discovery ? (
            <span className="inline-flex items-center gap-1.5">
              <LiveDot />
              {discovery.slots.length.toLocaleString()} openings live within reach
            </span>
          ) : (
            "Checking live availability…"
          )
        }
        action={
          <Link
            href="/search"
            className="hidden shrink-0 items-center gap-1 text-[13.5px] font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {!discovery ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : nearby.length === 0 ? (
          <EmptyState
            icon={<Store className="h-5 w-5" />}
            title="Nothing available at that exact location"
            body="Try widening your search radius or picking a nearby neighbourhood."
            action={<ButtonLink href="/search" size="sm">Search everything</ButtonLink>}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {nearby.map((view, i) => (
              <motion.div
                key={view.business.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.2) }}
              >
                <BusinessCard
                  view={view}
                  now={discovery.now}
                  isFavorite={favoriteIds.has(view.business.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ---- Trust + business CTA ---------------------------------------- */}
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { icon: <LiveDot />, title: "Real availability", body: "Every time shown is a slot the business has actually opened." },
          { icon: <ShieldCheck className="h-4 w-4 text-brand-500" />, title: "Transparent prices", body: "The price you see is the price at the chair, fees included at checkout." },
          { icon: <Sparkles className="h-4 w-4 text-brand-500" />, title: "Verified reviews", body: "Only customers who completed a booking can leave one." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-line bg-surface p-4">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              {item.icon}
              {item.title}
            </span>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
          </div>
        ))}
      </div>

      <Link
        href="/for-business"
        className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-200 hover:shadow-card"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Store className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">Empty slot? Fill it.</span>
          <span className="block text-[13px] text-ink-muted">
            Turn cancellations and unused time into revenue with NOW for business.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
      </Link>

      <HomeFooter />
    </CustomerShell>
  );
}

function HomeFooter() {
  return (
    <footer className="mt-10 border-t border-line pt-6 text-[12.5px] text-ink-muted">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/for-business" className="hover:text-ink">For business</Link>
        <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
        <Link href="/philadelphia" className="hover:text-ink">Philadelphia</Link>
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/legal/cancellation-policy" className="hover:text-ink">Cancellations</Link>
        <Link href="/support" className="hover:text-ink">Support</Link>
      </div>
      <p className="mt-3 leading-relaxed">
        NOW is a product prototype. All businesses, reviews, prices and availability shown are
        fictional demo data.
      </p>
    </footer>
  );
}
