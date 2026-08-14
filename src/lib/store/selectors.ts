import type { MarketplaceState } from "./state";
import type {
  AppointmentView,
  BusinessView,
  DateOnly,
  OpenSlot,
  SlotView,
  TimeOnly,
} from "../types";
import { haversineMiles, type LatLng } from "../geo";
import { discountPct } from "../pricing";
import { addDays, minutesUntil, timeToMinutes, toDateOnly, toTimeOnly } from "../time";

/**
 * Read models. Components never touch raw tables — they ask for a view, which
 * joins, ranks and filters. When the data moves to Postgres these become SQL
 * views / RPCs with the same names and shapes.
 */

export function buildSlotView(
  state: MarketplaceState,
  slot: OpenSlot,
  origin: LatLng,
  now: Date,
): SlotView | null {
  const business = state.businesses.find((b) => b.id === slot.business_id);
  const service = state.services.find((s) => s.id === slot.service_id);
  const staff = state.staff.find((s) => s.id === slot.staff_id);
  if (!business || !service || !staff) return null;
  const category = state.categories.find((c) => c.id === service.category_id);
  if (!category) return null;

  const price = slot.offer_price_cents ?? slot.original_price_cents;
  return {
    slot,
    business,
    service,
    staff,
    category,
    distance_miles: haversineMiles(origin, { lat: business.lat, lng: business.lng }),
    price_cents: price,
    discount_pct: discountPct(slot.original_price_cents, slot.offer_price_cents),
    minutes_until: minutesUntil(slot.date, slot.start_time, now),
  };
}

/** Slots a customer can actually book right now. */
export function bookableSlots(state: MarketplaceState, origin: LatLng): SlotView[] {
  const now = new Date(state.now);
  const views: SlotView[] = [];
  for (const slot of state.slots) {
    if (slot.status !== "available" && slot.status !== "held") continue;
    const view = buildSlotView(state, slot, origin, now);
    if (!view) continue;
    if (view.minutes_until < 5) continue;
    if (view.business.status !== "active") continue;
    if (!view.service.is_active || !view.service.online_booking_enabled) continue;
    if (view.slot.visibility_radius_miles != null &&
        view.distance_miles > view.slot.visibility_radius_miles) continue;
    views.push(view);
  }
  return views.sort((a, b) => a.minutes_until - b.minutes_until);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export type Availability = "any" | "now" | "today" | "tomorrow" | "date";
export type SortKey = "recommended" | "soonest" | "nearest" | "price" | "rating";

export interface SearchFilters {
  q: string;
  categorySlug: string | null;
  availability: Availability;
  date: DateOnly | null;
  /** Minutes from midnight. */
  timeFrom: number | null;
  timeTo: number | null;
  maxPriceCents: number | null;
  maxDistanceMiles: number | null;
  minRating: number | null;
  dealsOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: SearchFilters = {
  q: "",
  categorySlug: null,
  availability: "any",
  date: null,
  timeFrom: null,
  timeTo: null,
  maxPriceCents: null,
  maxDistanceMiles: null,
  minRating: null,
  dealsOnly: false,
  sort: "recommended",
};

/** "Available now" means startable within the next two hours. */
const NOW_WINDOW_MINUTES = 120;

export function filterSlots(
  slots: SlotView[],
  filters: SearchFilters,
  state: MarketplaceState,
): SlotView[] {
  const today = toDateOnly(new Date(state.now));
  const terms = tokenize(filters.q);

  return slots.filter((v) => {
    if (filters.categorySlug) {
      const catIds = v.business.category_ids;
      const matches =
        v.category.slug === filters.categorySlug ||
        catIds.some((id) => state.categories.find((c) => c.id === id)?.slug === filters.categorySlug);
      if (!matches) return false;
    }

    if (terms.length && !matchesTerms(v, terms, state)) return false;

    switch (filters.availability) {
      case "now":
        if (v.minutes_until > NOW_WINDOW_MINUTES) return false;
        break;
      case "today":
        if (v.slot.date !== today) return false;
        break;
      case "tomorrow":
        if (v.slot.date !== addDays(today, 1)) return false;
        break;
      case "date":
        if (filters.date && v.slot.date !== filters.date) return false;
        break;
    }

    const startMin = timeToMinutes(v.slot.start_time);
    if (filters.timeFrom != null && startMin < filters.timeFrom) return false;
    if (filters.timeTo != null && startMin > filters.timeTo) return false;
    if (filters.maxPriceCents != null && v.price_cents > filters.maxPriceCents) return false;
    if (filters.maxDistanceMiles != null && v.distance_miles > filters.maxDistanceMiles) return false;
    if (filters.minRating != null && v.business.rating < filters.minRating) return false;
    if (filters.dealsOnly && v.discount_pct <= 0) return false;

    return true;
  });
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function matchesTerms(v: SlotView, terms: string[], state: MarketplaceState): boolean {
  const haystack = [
    v.business.name,
    v.business.tagline,
    v.business.neighborhood,
    v.service.name,
    v.service.description,
    v.staff.full_name,
    v.category.name,
    v.category.plural_name,
    ...v.category.synonyms,
    ...v.business.category_ids.flatMap((id) => {
      const c = state.categories.find((x) => x.id === id);
      return c ? [c.name, c.plural_name, ...c.synonyms] : [];
    }),
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((t) => haystack.includes(t));
}

/** Collapse slots into one card per business, ranked for the results list. */
export function groupIntoBusinessViews(
  slots: SlotView[],
  state: MarketplaceState,
  filters: SearchFilters,
): BusinessView[] {
  const now = new Date(state.now);
  const byBusiness = new Map<string, SlotView[]>();
  for (const v of slots) {
    const list = byBusiness.get(v.business.id) ?? [];
    list.push(v);
    byBusiness.set(v.business.id, list);
  }

  const views: BusinessView[] = [];
  for (const [businessId, list] of byBusiness) {
    const sorted = [...list].sort((a, b) => a.minutes_until - b.minutes_until);
    const business = sorted[0].business;
    const services = state.services.filter((s) => s.business_id === businessId && s.is_active);
    const category =
      state.categories.find((c) => c.id === business.primary_category_id) ?? sorted[0].category;
    const deals = sorted.filter((s) => s.discount_pct > 0);
    const hours = openState(state, businessId, now);

    // Two staff free at 3:15 is one 3:15 opening as far as a customer cares;
    // keep the better-priced one.
    const byTime = new Map<string, SlotView>();
    for (const s of sorted) {
      const key = `${s.slot.date}T${s.slot.start_time}`;
      const held = byTime.get(key);
      if (!held || s.price_cents < held.price_cents) byTime.set(key, s);
    }
    const distinct = [...byTime.values()].sort((a, b) => a.minutes_until - b.minutes_until);

    views.push({
      business,
      category,
      distance_miles: sorted[0].distance_miles,
      from_price_cents: Math.min(
        ...services.filter((s) => s.price_cents > 0).map((s) => s.price_cents),
      ),
      next_slot: distinct[0],
      upcoming_slots: distinct.slice(0, 8),
      slot_count: distinct.length,
      best_deal: deals.sort((a, b) => b.discount_pct - a.discount_pct)[0] ?? null,
      open_until: hours.closesAt,
      is_open_now: hours.isOpen,
      services,
    });
  }

  return sortBusinessViews(views, filters.sort);
}

export function sortBusinessViews(views: BusinessView[], sort: SortKey): BusinessView[] {
  const copy = [...views];
  switch (sort) {
    case "soonest":
      return copy.sort((a, b) => (a.next_slot?.minutes_until ?? 1e9) - (b.next_slot?.minutes_until ?? 1e9));
    case "nearest":
      return copy.sort((a, b) => a.distance_miles - b.distance_miles);
    case "price":
      return copy.sort((a, b) => priceOf(a) - priceOf(b));
    case "rating":
      return copy.sort((a, b) => b.business.rating - a.business.rating);
    case "recommended":
    default:
      return copy.sort((a, b) => recommendScore(b) - recommendScore(a));
  }
}

function priceOf(v: BusinessView): number {
  return v.next_slot?.price_cents ?? v.from_price_cents;
}

/**
 * Recommendation blend: how soon, how close, how well rated, and whether
 * there's a live deal. Tuned so a great salon 3 miles out can still beat a
 * mediocre one next door.
 */
function recommendScore(v: BusinessView): number {
  const soon = v.next_slot ? Math.max(0, 1 - v.next_slot.minutes_until / (60 * 24)) : 0;
  const near = Math.max(0, 1 - v.distance_miles / 10);
  const rated = (v.business.rating - 3.5) / 1.5;
  const dealt = v.best_deal ? 0.35 : 0;
  const verified = v.business.verification_status === "verified" ? 0.12 : 0;
  return soon * 1.4 + near * 1.0 + rated * 1.1 + dealt + verified;
}

/* -------------------------------------------------------------------------- */
/* Business hours                                                              */
/* -------------------------------------------------------------------------- */

export function openState(
  state: MarketplaceState,
  businessId: string,
  now: Date,
): { isOpen: boolean; closesAt: TimeOnly | null; opensAt: TimeOnly | null } {
  const hours = state.businessHours.find(
    (h) => h.business_id === businessId && h.day_of_week === now.getDay(),
  );
  if (!hours || hours.is_closed || !hours.opens_at || !hours.closes_at) {
    return { isOpen: false, closesAt: null, opensAt: null };
  }
  const mins = timeToMinutes(toTimeOnly(now));
  const isOpen = mins >= timeToMinutes(hours.opens_at) && mins < timeToMinutes(hours.closes_at);
  return { isOpen, closesAt: hours.closes_at, opensAt: hours.opens_at };
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                                */
/* -------------------------------------------------------------------------- */

export function appointmentView(
  state: MarketplaceState,
  appointmentId: string,
): AppointmentView | null {
  const appointment = state.appointments.find((a) => a.id === appointmentId);
  if (!appointment) return null;
  const business = state.businesses.find((b) => b.id === appointment.business_id);
  const staff = state.staff.find((s) => s.id === appointment.staff_id);
  const customer = state.users.find((u) => u.id === appointment.customer_id);
  if (!business || !staff || !customer) return null;

  const lines = state.appointmentServices.filter((l) => l.appointment_id === appointment.id);
  const services: AppointmentView["services"] = [];
  for (const line of lines) {
    const service = state.services.find((s) => s.id === line.service_id);
    if (service) services.push({ service, line });
  }

  const category =
    state.categories.find((c) => c.id === services[0]?.service.category_id) ??
    state.categories.find((c) => c.id === business.primary_category_id)!;

  return {
    appointment,
    business,
    staff,
    customer,
    services,
    category,
    review: state.reviews.find((r) => r.appointment_id === appointment.id) ?? null,
  };
}

export function customerAppointments(state: MarketplaceState, customerId: string) {
  const today = toDateOnly(new Date(state.now));
  const nowMin = timeToMinutes(toTimeOnly(new Date(state.now)));
  const mine = state.appointments.filter((a) => a.customer_id === customerId);

  const isUpcoming = (a: (typeof mine)[number]) =>
    (a.status === "confirmed" || a.status === "pending") &&
    (a.date > today || (a.date === today && timeToMinutes(a.end_time) >= nowMin));

  return {
    upcoming: mine
      .filter(isUpcoming)
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)),
    past: mine
      .filter((a) => !isUpcoming(a))
      .sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`)),
  };
}

export function businessAppointmentsOn(
  state: MarketplaceState,
  businessId: string,
  date: DateOnly,
) {
  return state.appointments
    .filter((a) => a.business_id === businessId && a.date === date)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

export function businessSlotsOn(state: MarketplaceState, businessId: string, date: DateOnly) {
  return state.slots
    .filter((s) => s.business_id === businessId && s.date === date)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                  */
/* -------------------------------------------------------------------------- */

export interface BusinessMetrics {
  todayRevenueCents: number;
  todayBookings: number;
  openSlotsToday: number;
  newCustomersToday: number;
  monthRevenueCents: number;
  monthBookings: number;
  /** The headline metric: revenue from slots NOW filled that were otherwise empty. */
  recoveredCents: number;
  recoveredCount: number;
  fillRate: number;
  cancellationRate: number;
  averageBookingCents: number;
  returningRate: number;
  platformFeesCents: number;
  pendingPayoutCents: number;
  availableBalanceCents: number;
}

export function businessMetrics(state: MarketplaceState, businessId: string): BusinessMetrics {
  const now = new Date(state.now);
  const today = toDateOnly(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const all = state.appointments.filter((a) => a.business_id === businessId);
  const earning = (a: (typeof all)[number]) =>
    a.status === "completed" || a.status === "confirmed" || a.status === "no_show";

  const todays = all.filter((a) => a.date === today && earning(a));
  const month = all.filter((a) => a.date >= monthStart && a.date <= today && earning(a));
  const monthAll = all.filter((a) => a.date >= monthStart && a.date <= today);

  const recovered = month.filter((a) => a.from_open_slot);
  const openToday = state.slots.filter(
    (s) => s.business_id === businessId && s.date === today && s.status === "available",
  );

  const firstSeen = new Map<string, string>();
  for (const a of [...all].sort((x, y) => x.date.localeCompare(y.date))) {
    if (!firstSeen.has(a.customer_id)) firstSeen.set(a.customer_id, a.date);
  }
  const newToday = [...firstSeen.values()].filter((d) => d === today).length;
  const monthCustomers = new Set(month.map((a) => a.customer_id));
  const returning = [...monthCustomers].filter(
    (id) => (firstSeen.get(id) ?? today) < monthStart,
  ).length;

  // Openings that are still listed, plus the ones already converted into
  // bookings — otherwise a freshly generated inventory always reads as 0%.
  const openInventory = state.slots.filter(
    (s) => s.business_id === businessId && s.date >= monthStart && s.status !== "blocked",
  ).length;
  const filled = recovered.length;
  const publishedTotal = openInventory + filled;

  const cancelled = monthAll.filter(
    (a) => a.status === "cancelled_by_customer" || a.status === "cancelled_by_business" || a.status === "no_show",
  ).length;

  const monthRevenue = month.reduce((sum, a) => sum + a.payout_cents, 0);
  const pendingPayout = all
    .filter((a) => a.status === "confirmed" && a.date >= today)
    .reduce((sum, a) => sum + a.payout_cents, 0);
  const paidOut = state.payouts
    .filter((p) => p.business_id === businessId && p.status !== "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return {
    todayRevenueCents: todays.reduce((sum, a) => sum + a.payout_cents, 0),
    todayBookings: todays.length,
    openSlotsToday: openToday.length,
    newCustomersToday: newToday,
    monthRevenueCents: monthRevenue,
    monthBookings: month.length,
    recoveredCents: recovered.reduce((sum, a) => sum + a.payout_cents, 0),
    recoveredCount: recovered.length,
    fillRate: publishedTotal ? filled / publishedTotal : 0,
    cancellationRate: monthAll.length ? cancelled / monthAll.length : 0,
    averageBookingCents: month.length ? Math.round(monthRevenue / month.length) : 0,
    returningRate: monthCustomers.size ? returning / monthCustomers.size : 0,
    platformFeesCents: month.reduce((sum, a) => sum + a.commission_cents, 0),
    pendingPayoutCents: pendingPayout,
    availableBalanceCents: paidOut,
  };
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastVisit: DateOnly | null;
  nextVisit: DateOnly | null;
  totalBookings: number;
  totalSpentCents: number;
  noShows: number;
}

export function businessCustomers(state: MarketplaceState, businessId: string): CustomerRecord[] {
  const today = toDateOnly(new Date(state.now));
  const map = new Map<string, CustomerRecord>();

  for (const a of state.appointments.filter((x) => x.business_id === businessId)) {
    const user = state.users.find((u) => u.id === a.customer_id);
    if (!user) continue;
    const rec =
      map.get(a.customer_id) ??
      {
        id: user.id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        lastVisit: null,
        nextVisit: null,
        totalBookings: 0,
        totalSpentCents: 0,
        noShows: 0,
      };

    if (a.status === "completed" || a.status === "no_show") {
      rec.totalBookings += 1;
      rec.totalSpentCents += a.status === "completed" ? a.subtotal_cents : 0;
      if (!rec.lastVisit || a.date > rec.lastVisit) rec.lastVisit = a.date;
    }
    if (a.status === "no_show") rec.noShows += 1;
    if (a.status === "confirmed" && a.date >= today) {
      rec.totalBookings += 1;
      if (!rec.nextVisit || a.date < rec.nextVisit) rec.nextVisit = a.date;
    }
    map.set(a.customer_id, rec);
  }

  return [...map.values()].sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));
}

export interface PlatformMetrics {
  totalUsers: number;
  customers: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  bookings30d: number;
  gmvCents: number;
  revenueCents: number;
  payoutsCents: number;
  averageOrderCents: number;
  repeatRate: number;
  openDisputes: number;
  reportedReviews: number;
  topCategories: { name: string; bookings: number; gmvCents: number }[];
  topCities: { name: string; businesses: number; bookings: number }[];
}

export function platformMetrics(state: MarketplaceState): PlatformMetrics {
  const today = toDateOnly(new Date(state.now));
  const from = addDays(today, -30);
  const window = state.appointments.filter(
    (a) => a.date >= from && a.date <= today && a.status !== "cancelled_by_customer" && a.status !== "cancelled_by_business",
  );
  const gmv = window.reduce((sum, a) => sum + a.total_cents, 0);
  const revenue = window.reduce((sum, a) => sum + a.commission_cents + a.service_fee_cents, 0);

  const perCustomer = new Map<string, number>();
  window.forEach((a) => perCustomer.set(a.customer_id, (perCustomer.get(a.customer_id) ?? 0) + 1));
  const repeat = [...perCustomer.values()].filter((n) => n > 1).length;

  const catTotals = new Map<string, { bookings: number; gmv: number }>();
  for (const a of window) {
    const line = state.appointmentServices.find((l) => l.appointment_id === a.id);
    const service = line && state.services.find((s) => s.id === line.service_id);
    const cat = service && state.categories.find((c) => c.id === service.category_id);
    if (!cat) continue;
    const rec = catTotals.get(cat.name) ?? { bookings: 0, gmv: 0 };
    rec.bookings += 1;
    rec.gmv += a.total_cents;
    catTotals.set(cat.name, rec);
  }

  return {
    totalUsers: state.users.length,
    customers: state.users.filter((u) => u.account_type === "customer").length,
    activeBusinesses: state.businesses.filter((b) => b.status === "active").length,
    pendingBusinesses: state.businesses.filter((b) => b.status === "pending").length,
    bookings30d: window.length,
    gmvCents: gmv,
    revenueCents: revenue,
    payoutsCents: window.reduce((sum, a) => sum + a.payout_cents, 0),
    averageOrderCents: window.length ? Math.round(gmv / window.length) : 0,
    repeatRate: perCustomer.size ? repeat / perCustomer.size : 0,
    openDisputes: state.disputes.filter((d) => d.status === "open" || d.status === "under_review").length,
    reportedReviews: state.reviews.filter((r) => r.is_reported && !r.is_hidden).length,
    topCategories: [...catTotals.entries()]
      .map(([name, v]) => ({ name, bookings: v.bookings, gmvCents: v.gmv }))
      .sort((a, b) => b.gmvCents - a.gmvCents)
      .slice(0, 6),
    topCities: [
      {
        name: "Philadelphia, PA",
        businesses: state.businesses.length,
        bookings: window.length,
      },
    ],
  };
}
