import { buildCatalog, type Catalog } from "./catalog";
import { CATEGORIES, categoryById } from "./categories";
import { PHILADELPHIA } from "./cities";
import { toDateOnly } from "../time";
import type { Business, Review, Service, Staff, User } from "../types";

/**
 * Server-side reads for the SEO-relevant surfaces.
 *
 * Business profiles, category pages and city pages must render real content
 * without JavaScript, so they read the static half of the catalog directly.
 * Live availability is layered in on the client — see `<BusinessAvailability>`.
 */
function catalog(): Catalog {
  return buildCatalog(toDateOnly(new Date()));
}

export interface BusinessProfileData {
  business: Business;
  services: Service[];
  staff: Staff[];
  staffServiceIds: Record<string, string[]>;
  reviews: Array<Review & { author: string; serviceName: string | null; staffName: string | null }>;
  hours: { day: number; opens_at: string | null; closes_at: string | null; is_closed: boolean }[];
  category: ReturnType<typeof categoryById>;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function getBusinessProfile(slug: string): BusinessProfileData | null {
  const c = catalog();
  const business = c.businesses.find((b) => b.slug === slug);
  if (!business) return null;

  const services = c.services
    .filter((s) => s.business_id === business.id && s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const staff = c.staff.filter((s) => s.business_id === business.id && s.is_active);

  const staffServiceIds: Record<string, string[]> = {};
  for (const member of staff) {
    staffServiceIds[member.id] = c.staffServices
      .filter((ss) => ss.staff_id === member.id)
      .map((ss) => ss.service_id);
  }

  const reviews = c.reviews
    .filter((r) => r.business_id === business.id && !r.is_hidden)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const appt = c.appointments.find((a) => a.id === r.appointment_id);
      const line = appt && c.appointmentServices.find((l) => l.appointment_id === appt.id);
      const service = line && c.services.find((s) => s.id === line.service_id);
      const author = c.users.find((u) => u.id === r.customer_id);
      const member = c.staff.find((s) => s.id === r.staff_id);
      return {
        ...r,
        author: author ? shortName(author) : "NOW customer",
        serviceName: service?.name ?? null,
        staffName: member?.full_name ?? null,
      };
    });

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of reviews) ratingBreakdown[r.rating] += 1;

  return {
    business,
    services,
    staff,
    staffServiceIds,
    reviews,
    hours: c.businessHours
      .filter((h) => h.business_id === business.id)
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map((h) => ({
        day: h.day_of_week,
        opens_at: h.opens_at,
        closes_at: h.closes_at,
        is_closed: h.is_closed,
      })),
    category: categoryById(business.primary_category_id),
    ratingBreakdown,
  };
}

export function getAllBusinessSlugs(): string[] {
  return catalog().businesses.map((b) => b.slug);
}

export interface CategoryListing {
  business: Business;
  fromPriceCents: number;
  serviceCount: number;
  categoryName: string;
}

export function getCategoryListings(categorySlug: string): CategoryListing[] {
  const c = catalog();
  const category = CATEGORIES.find((x) => x.slug === categorySlug);
  if (!category) return [];

  return c.businesses
    .filter((b) => b.status === "active" && b.category_ids.includes(category.id))
    .map((business) => {
      const services = c.services.filter(
        (s) => s.business_id === business.id && s.is_active && s.price_cents > 0,
      );
      return {
        business,
        fromPriceCents: services.length ? Math.min(...services.map((s) => s.price_cents)) : 0,
        serviceCount: services.length,
        categoryName: category.name,
      };
    })
    .sort((a, b) => b.business.rating - a.business.rating);
}

export function getCityStats() {
  const c = catalog();
  return {
    city: PHILADELPHIA,
    businessCount: c.businesses.length,
    categories: CATEGORIES.filter((cat) =>
      c.businesses.some((b) => b.category_ids.includes(cat.id)),
    ).map((cat) => ({
      ...cat,
      count: c.businesses.filter((b) => b.category_ids.includes(cat.id)).length,
    })),
  };
}

function shortName(user: User): string {
  const [first, last] = user.full_name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}
