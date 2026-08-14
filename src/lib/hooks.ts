"use client";

import { useMemo } from "react";
import { useMarketplace, useActions } from "./store";
import {
  bookableSlots,
  businessMetrics,
  filterSlots,
  groupIntoBusinessViews,
  type SearchFilters,
} from "./store/selectors";
import type { MarketplaceState } from "./store/state";
import type { SlotView } from "./types";
import type { LatLng } from "./geo";

/**
 * Discovery context: the live slot inventory joined to the customer's origin.
 * Everything the customer-facing surfaces render derives from this.
 */
export interface Discovery {
  state: MarketplaceState;
  origin: LatLng;
  now: Date;
  slots: SlotView[];
}

export function useDiscovery(): Discovery | null {
  const { state, location } = useMarketplace();
  return useMemo(() => {
    if (!state) return null;
    const origin = { lat: location.lat, lng: location.lng };
    return {
      state,
      origin,
      now: new Date(state.now),
      slots: bookableSlots(state, origin),
    };
  }, [state, location.lat, location.lng]);
}

/** Search results grouped into business cards, with the filter pipeline applied. */
export function useSearchResults(filters: SearchFilters) {
  const discovery = useDiscovery();
  return useMemo(() => {
    if (!discovery) return null;
    const matched = filterSlots(discovery.slots, filters, discovery.state);
    return {
      ...discovery,
      matchedSlots: matched,
      businesses: groupIntoBusinessViews(matched, discovery.state, filters),
    };
  }, [discovery, filters]);
}

/**
 * Last-minute openings: discounted or imminent slots, de-duplicated to one per
 * business so the rail shows variety rather than one salon's whole afternoon.
 */
export function useDeals(limit = 12) {
  const discovery = useDiscovery();
  return useMemo(() => {
    if (!discovery) return null;
    const eligible = discovery.slots.filter(
      (s) => s.discount_pct > 0 && s.minutes_until <= 60 * 30,
    );
    const ranked = [...eligible].sort(byUrgency);

    // One card per offer, not per time: three identical "Beard Trim, 27% off"
    // rows are noise — the remaining-slot count carries that information.
    const byOffer = new Map<string, SlotView>();
    for (const slot of ranked) {
      const key = `${slot.business.id}:${slot.service.id}:${slot.slot.date}`;
      if (!byOffer.has(key)) byOffer.set(key, slot);
    }
    const offers = [...byOffer.values()].sort(byUrgency);

    // The home rail goes further and shows at most one business each, so the
    // strip reads as a tour of the neighbourhood rather than one salon's day.
    const seen = new Set<string>();
    const unique: SlotView[] = [];
    for (const slot of offers) {
      if (seen.has(slot.business.id)) continue;
      seen.add(slot.business.id);
      unique.push(slot);
    }

    return {
      ...discovery,
      deals: unique.slice(0, limit),
      allDeals: offers,
    };
  }, [discovery, limit]);
}

function byUrgency(a: SlotView, b: SlotView): number {
  // Bigger discount first within the same rough time window, otherwise sooner.
  const bucket = (v: SlotView) => Math.floor(v.minutes_until / 240);
  return bucket(a) - bucket(b) || b.discount_pct - a.discount_pct || a.minutes_until - b.minutes_until;
}

/** How many openings the same business still has for that service on that day. */
export function remainingForDeal(slots: SlotView[], deal: SlotView): number {
  return slots.filter(
    (s) =>
      s.business.id === deal.business.id &&
      s.service.id === deal.service.id &&
      s.slot.date === deal.slot.date,
  ).length;
}

export function useFavorites() {
  const { state, session } = useMarketplace();
  const { toggleFavorite } = useActions();
  const ids = useMemo(() => {
    if (!state || !session.userId) return new Set<string>();
    return new Set(
      state.favorites.filter((f) => f.customer_id === session.userId).map((f) => f.business_id),
    );
  }, [state, session.userId]);

  return { favoriteIds: ids, toggleFavorite, isSignedIn: Boolean(session.userId) };
}

/** Business dashboard context — scoped to the signed-in business only. */
export function useBusinessContext() {
  const { state, session } = useMarketplace();
  return useMemo(() => {
    if (!state || !session.businessId) return null;
    const business = state.businesses.find((b) => b.id === session.businessId);
    if (!business) return null;
    return {
      state,
      business,
      now: new Date(state.now),
      services: state.services.filter((s) => s.business_id === business.id),
      staff: state.staff.filter((s) => s.business_id === business.id && s.is_active),
      metrics: businessMetrics(state, business.id),
    };
  }, [state, session.businessId]);
}
