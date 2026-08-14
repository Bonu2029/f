import type {
  AppNotification,
  Appointment,
  AppointmentService,
  Business,
  BusinessHours,
  BusinessMember,
  BusinessVerification,
  CustomerProfile,
  Dispute,
  Favorite,
  Message,
  MessageThread,
  Payment,
  PaymentMethod,
  Payout,
  Review,
  Service,
  ServiceCategory,
  Staff,
  StaffAvailability,
  StaffService,
  User,
} from "../types";
import { BUSINESS_SEEDS, type BusinessSeed } from "./business-seeds";
import { CATEGORIES, categoryBySlug } from "./categories";
import { CITIES, PHILADELPHIA } from "./cities";
import { DEFAULT_PLATFORM_SETTINGS } from "../config";
import { priceBooking } from "../pricing";
import { addDays, addMinutes, minutesToTime, parseDateOnly, timeToMinutes, toDateOnly } from "../time";
import { pick, seededRandom, stableId } from "../utils";
import type { DateOnly } from "../types";

/**
 * Builds the full demo entity graph from the seeds.
 *
 * Everything is derived deterministically from `anchor` (today's date), so the
 * server and the browser produce byte-identical data during hydration, and the
 * demo stays "alive" — history is always relative to today, never a frozen
 * date in the past.
 */
export interface Catalog {
  anchor: DateOnly;
  categories: ServiceCategory[];
  businesses: Business[];
  services: Service[];
  staff: Staff[];
  staffServices: StaffService[];
  staffAvailability: StaffAvailability[];
  businessHours: BusinessHours[];
  verifications: BusinessVerification[];
  users: User[];
  customerProfiles: CustomerProfile[];
  businessMembers: BusinessMember[];
  appointments: Appointment[];
  appointmentServices: AppointmentService[];
  reviews: Review[];
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  payouts: Payout[];
  favorites: Favorite[];
  threads: MessageThread[];
  messages: Message[];
  notifications: AppNotification[];
  disputes: Dispute[];
}

/* -------------------------------------------------------------------------- */
/* Demo account identities                                                     */
/* -------------------------------------------------------------------------- */

export const DEMO_CUSTOMER_ID = stableId("user", "maya");
export const DEMO_ADMIN_ID = stableId("user", "admin");
/** Luxe Nail Studio is the demo business account. */
export const DEMO_BUSINESS_SLUG = "luxe-nail-studio";
export const DEMO_BUSINESS_ID = stableId("business", DEMO_BUSINESS_SLUG);
export const DEMO_BUSINESS_OWNER_ID = stableId("user", "owner-luxe-nail-studio");

const CUSTOMER_NAMES = [
  "Sarah Whitmore", "Michael Duarte", "Jessica Alvarez", "Daniel Osei", "Emily Novak",
  "Tomas Reyes", "Rachel Kim", "Andre Boyd", "Nina Petrov", "Chris Callahan",
  "Leah Bernstein", "Marcus Webb", "Sofia Marchetti", "Trevor Lang", "Isabel Okonjo",
  "Ben Halloran", "Grace Nakamura", "Victor Salas", "Chloe Bennett", "Omar Haddad",
  "Katie Donnelly", "Ravi Menon", "Paige Sullivan", "Elias Fischer", "Monica Trent",
  "Jared Whitfield", "Simone Baptiste", "Alan Pruitt", "Dara Fitzgerald", "Hugo Vance",
  "Bianca Ferraro", "Nathan Cole", "Aisha Rahman", "Peter Vaughn", "Lila Moreau",
  "Gavin Doyle", "Rosa Iglesias", "Theo Blackwood", "Nadia Farouk", "Colin Reeves",
];

const CANCEL_REASONS = [
  "Something came up at work.",
  "Feeling under the weather.",
  "Scheduling conflict — will rebook.",
  "Rebooked for a better time.",
];

/* -------------------------------------------------------------------------- */
/* Builder                                                                     */
/* -------------------------------------------------------------------------- */

let cache: Catalog | null = null;

export function buildCatalog(anchor: DateOnly): Catalog {
  if (cache && cache.anchor === anchor) return cache;
  cache = create(anchor);
  return cache;
}

function create(anchor: DateOnly): Catalog {
  const c: Catalog = {
    anchor,
    categories: CATEGORIES,
    businesses: [],
    services: [],
    staff: [],
    staffServices: [],
    staffAvailability: [],
    businessHours: [],
    verifications: [],
    users: [],
    customerProfiles: [],
    businessMembers: [],
    appointments: [],
    appointmentServices: [],
    reviews: [],
    payments: [],
    paymentMethods: [],
    payouts: [],
    favorites: [],
    threads: [],
    messages: [],
    notifications: [],
    disputes: [],
  };

  const now = `${anchor}T09:00:00.000Z`;

  /* ---- Customers -------------------------------------------------------- */

  const maya: User = {
    id: DEMO_CUSTOMER_ID,
    email: "maya@example.demo",
    phone: "(215) 555-0110",
    full_name: "Maya Ellison",
    avatar_url: null,
    account_type: "customer",
    created_at: `${addDays(anchor, -420)}T12:00:00.000Z`,
    updated_at: now,
  };
  c.users.push(maya);
  c.customerProfiles.push({
    user_id: maya.id,
    default_location_id: PHILADELPHIA.id,
    location_label: "Philadelphia, PA",
    lat: 39.9526,
    lng: -75.1652,
    search_radius_miles: DEFAULT_PLATFORM_SETTINGS.default_search_radius_miles,
    notification_prefs: {
      appointment_reminders: true,
      last_minute_deals: true,
      favorite_businesses: true,
      nearby_openings: true,
      promotional: false,
    },
    created_at: maya.created_at,
    updated_at: now,
  });
  c.paymentMethods.push(
    {
      id: stableId("pm", "maya-visa"),
      customer_id: maya.id,
      brand: "Visa",
      last4: "4242",
      exp_month: 8,
      exp_year: 2029,
      is_default: true,
      wallet: null,
    },
    {
      id: stableId("pm", "maya-applepay"),
      customer_id: maya.id,
      brand: "Apple Pay",
      last4: "8801",
      exp_month: 3,
      exp_year: 2028,
      is_default: false,
      wallet: "apple_pay",
    },
  );

  CUSTOMER_NAMES.forEach((name, i) => {
    const id = stableId("user", `customer-${i}`);
    const handle = name.toLowerCase().replace(/[^a-z]+/g, ".");
    const rand = seededRandom(`cust-${i}`);
    c.users.push({
      id,
      email: `${handle}@example.demo`,
      phone: `(215) 555-${`${1200 + i}`.slice(-4)}`,
      full_name: name,
      avatar_url: null,
      account_type: "customer",
      created_at: `${addDays(anchor, -Math.floor(rand() * 500) - 30)}T12:00:00.000Z`,
      updated_at: now,
    });
  });

  c.users.push({
    id: DEMO_ADMIN_ID,
    email: "admin@booknow.demo",
    phone: "(215) 555-0100",
    full_name: "Jordan Avery",
    avatar_url: null,
    account_type: "admin",
    created_at: `${addDays(anchor, -700)}T12:00:00.000Z`,
    updated_at: now,
  });

  const customers = c.users.filter((u) => u.account_type === "customer");

  /* ---- Businesses ------------------------------------------------------- */

  BUSINESS_SEEDS.forEach((seed, bi) => {
    buildBusiness(c, seed, bi, anchor, customers);
  });

  /* ---- Cross-cutting demo content --------------------------------------- */

  buildMayaJourney(c, anchor);
  buildDisputes(c, anchor);
  buildPayouts(c, anchor);

  return c;
}

function buildBusiness(
  c: Catalog,
  seed: BusinessSeed,
  bi: number,
  anchor: DateOnly,
  customers: User[],
) {
  const rand = seededRandom(`business-${seed.slug}`);
  const businessId = stableId("business", seed.slug);
  const primary = categoryBySlug(seed.category)!;
  const isDemo = seed.slug === DEMO_BUSINESS_SLUG;
  const now = `${anchor}T09:00:00.000Z`;

  const business: Business = {
    id: businessId,
    slug: seed.slug,
    name: seed.name,
    tagline: seed.tagline,
    about: seed.about,
    primary_category_id: primary.id,
    category_ids: [primary.id, ...(seed.extraCategories ?? []).map((s) => categoryBySlug(s)!.id)],
    status: "active",
    verification_status: seed.verified ? "verified" : "pending",
    media_seed: seed.slug,
    gallery_seeds: [1, 2, 3, 4].map((n) => `${seed.slug}-g${n}`),
    phone: seed.phone,
    email: seed.email,
    website: seed.website ?? null,
    address_line1: seed.address,
    address_line2: null,
    city_id: PHILADELPHIA.id,
    neighborhood: seed.neighborhood,
    postal_code: seed.postal,
    lat: seed.lat,
    lng: seed.lng,
    timezone: PHILADELPHIA.timezone,
    rating: seed.rating,
    review_count: seed.reviewCount,
    price_level: seed.priceLevel,
    parking_note: seed.parking ?? null,
    cancellation_policy: {
      free_cancellation_hours:
        seed.freeCancellationHours ?? DEFAULT_PLATFORM_SETTINGS.default_free_cancellation_hours,
      late_cancellation_fee_pct: 50,
      no_show_fee_pct: 100,
    },
    commission_bps_override: null,
    instant_book: true,
    auto_fill_cancellations: isDemo,
    subscription_tier: seed.pro ? "pro" : "free",
    created_at: `${addDays(anchor, -600 + bi * 11)}T12:00:00.000Z`,
    updated_at: now,
  };
  c.businesses.push(business);

  c.verifications.push({
    id: stableId("verification", seed.slug),
    business_id: businessId,
    status: business.verification_status,
    business_registration_submitted: true,
    phone_verified: true,
    email_verified: true,
    address_verified: seed.verified,
    identity_verified: seed.verified,
    payout_account_connected: seed.verified,
    reviewed_by: seed.verified ? DEMO_ADMIN_ID : null,
    reviewed_at: seed.verified ? `${addDays(anchor, -560 + bi * 9)}T12:00:00.000Z` : null,
    notes: seed.verified ? null : "Awaiting proof of address.",
    created_at: business.created_at,
  });

  // Owner login
  const ownerSeedStaff = seed.staff[0];
  const ownerId = stableId("user", `owner-${seed.slug}`);
  c.users.push({
    id: ownerId,
    email: seed.email,
    phone: seed.phone,
    full_name: ownerSeedStaff.name,
    avatar_url: null,
    account_type: "business",
    created_at: business.created_at,
    updated_at: now,
  });
  c.businessMembers.push({
    id: stableId("member", `${seed.slug}-owner`),
    business_id: businessId,
    user_id: ownerId,
    role: "owner",
    created_at: business.created_at,
  });

  // Hours
  seed.hours.forEach((h, day) => {
    c.businessHours.push({
      id: stableId("hours", `${seed.slug}-${day}`),
      business_id: businessId,
      day_of_week: day,
      opens_at: h?.[0] ?? null,
      closes_at: h?.[1] ?? null,
      is_closed: h == null,
    });
  });

  // Services
  const services: Service[] = seed.services.map((s, si) => ({
    id: stableId("service", `${seed.slug}-${si}`),
    business_id: businessId,
    category_id: (s.category ? categoryBySlug(s.category)! : primary).id,
    name: s.name,
    description: s.description,
    duration_minutes: s.minutes,
    buffer_minutes: s.buffer ?? (s.minutes >= 120 ? 20 : 10),
    price_cents: s.price * 100,
    deposit_cents: s.deposit ? s.deposit * 100 : null,
    media_seed: `${seed.slug}-s${si}`,
    online_booking_enabled: true,
    is_active: true,
    sort_order: si,
    created_at: business.created_at,
  }));
  c.services.push(...services);

  // Staff
  const staffList: Staff[] = seed.staff.map((s, si) => ({
    id: stableId("staff", `${seed.slug}-${si}`),
    business_id: businessId,
    user_id: si === 0 ? ownerId : null,
    full_name: s.name,
    role: s.role,
    bio: s.bio,
    media_seed: `${seed.slug}-staff-${si}`,
    rating: s.rating,
    review_count: s.reviews,
    is_active: true,
    accepts_online_booking: true,
    created_at: business.created_at,
  }));
  c.staff.push(...staffList);

  seed.staff.forEach((s, si) => {
    const allowed = s.services ?? services.map((_, i) => i);
    allowed.forEach((serviceIndex) => {
      if (!services[serviceIndex]) return;
      c.staffServices.push({
        staff_id: staffList[si].id,
        service_id: services[serviceIndex].id,
      });
    });

    // Working hours mirror the shop's hours, with one staggered day off.
    seed.hours.forEach((h, day) => {
      const dayOff = (si + 2) % 7;
      c.staffAvailability.push({
        id: stableId("availability", `${seed.slug}-${si}-${day}`),
        staff_id: staffList[si].id,
        day_of_week: day,
        starts_at: h?.[0] ?? "09:00",
        ends_at: h?.[1] ?? "17:00",
        is_working: h != null && day !== dayOff,
      });
    });
  });

  /* ---- Historical bookings, reviews and payments ------------------------- */

  const historyCount = isDemo ? 64 : 22;
  for (let i = 0; i < historyCount; i++) {
    const daysAgo = 1 + Math.floor(rand() * 58);
    const customer = customers[Math.floor(rand() * customers.length)];
    const service = services[Math.floor(rand() * services.length)];
    const member = staffList[Math.floor(rand() * staffList.length)];
    const roll = rand();
    const status: Appointment["status"] =
      roll > 0.94
        ? "cancelled_by_customer"
        : roll > 0.915
          ? "no_show"
          : roll > 0.9
            ? "cancelled_by_business"
            : "completed";
    const fromSlot = rand() > 0.55;
    const deal = fromSlot && rand() > 0.45;
    pushAppointment(c, {
      key: `${seed.slug}-hist-${i}`,
      business,
      service,
      staff: member,
      customerId: customer.id,
      date: addDays(anchor, -daysAgo),
      startTime: minutesToTime(9 * 60 + Math.floor(rand() * 18) * 30),
      status,
      fromSlot,
      deal,
      cancellationReason:
        status === "cancelled_by_customer" ? pick(CANCEL_REASONS, rand) : null,
    });
  }

  // Reviews are always backed by a completed appointment.
  seed.reviews.forEach((r, ri) => {
    const service = services[r.serviceIndex ?? 0] ?? services[0];
    const member = staffList[r.staffIndex ?? 0] ?? staffList[0];
    const customer = customers.find((u) => u.full_name === r.author) ?? {
      ...customers[(ri * 7 + bi) % customers.length],
    };
    // Reviewers named in the seed become real customer accounts.
    let reviewerId = customer.id;
    if (!c.users.some((u) => u.full_name === r.author)) {
      reviewerId = stableId("user", `reviewer-${seed.slug}-${ri}`);
      c.users.push({
        id: reviewerId,
        email: `${r.author.toLowerCase().replace(/[^a-z]+/g, ".")}@example.demo`,
        phone: `(215) 555-${`${2000 + bi * 10 + ri}`.slice(-4)}`,
        full_name: r.author,
        avatar_url: null,
        account_type: "customer",
        created_at: `${addDays(anchor, -r.daysAgo - 40)}T12:00:00.000Z`,
        updated_at: now,
      });
    }

    const appt = pushAppointment(c, {
      key: `${seed.slug}-review-${ri}`,
      business,
      service,
      staff: member,
      customerId: reviewerId,
      date: addDays(anchor, -r.daysAgo),
      startTime: minutesToTime(10 * 60 + ((ri * 3) % 16) * 30),
      status: "completed",
      fromSlot: ri % 2 === 0,
      deal: ri % 3 === 0,
      cancellationReason: null,
    });

    c.reviews.push({
      id: stableId("review", `${seed.slug}-${ri}`),
      appointment_id: appt.id,
      business_id: businessId,
      customer_id: reviewerId,
      staff_id: member.id,
      rating: r.rating,
      body: r.body,
      photo_seeds: Array.from({ length: r.photos ?? 0 }, (_, p) => `${seed.slug}-r${ri}-p${p}`),
      business_reply: r.reply ?? null,
      business_replied_at: r.reply ? `${addDays(anchor, -r.daysAgo + 1)}T14:00:00.000Z` : null,
      is_reported: false,
      report_reason: null,
      is_hidden: false,
      created_at: `${addDays(anchor, -r.daysAgo)}T18:30:00.000Z`,
    });
  });

  /* ---- Today's book ------------------------------------------------------ */

  const openHour = seed.hours[parseDateOnly(anchor).getDay()];
  if (openHour) {
    const todayCount = isDemo ? 11 : 3 + Math.floor(rand() * 4);
    const openMin = timeToMinutes(openHour[0]);
    const closeMin = timeToMinutes(openHour[1]);
    const usedStarts = new Set<string>();
    for (let i = 0; i < todayCount; i++) {
      const service = services[Math.floor(rand() * services.length)];
      const member = staffList[Math.floor(rand() * staffList.length)];
      const span = Math.max(60, closeMin - openMin - service.duration_minutes);
      const start = minutesToTime(openMin + Math.floor((rand() * span) / 30) * 30);
      const key = `${member.id}-${start}`;
      if (usedStarts.has(key)) continue;
      usedStarts.add(key);
      pushAppointment(c, {
        key: `${seed.slug}-today-${i}`,
        business,
        service,
        staff: member,
        customerId: customers[Math.floor(rand() * customers.length)].id,
        date: anchor,
        startTime: start,
        status: "confirmed",
        fromSlot: rand() > 0.6,
        deal: rand() > 0.8,
        cancellationReason: null,
      });
    }

    // A handful of bookings already on the books for the next few days.
    for (let i = 0; i < (isDemo ? 14 : 5); i++) {
      const service = services[Math.floor(rand() * services.length)];
      const member = staffList[Math.floor(rand() * staffList.length)];
      const date = addDays(anchor, 1 + Math.floor(rand() * 6));
      const dayHours = seed.hours[parseDateOnly(date).getDay()];
      if (!dayHours) continue;
      pushAppointment(c, {
        key: `${seed.slug}-future-${i}`,
        business,
        service,
        staff: member,
        customerId: customers[Math.floor(rand() * customers.length)].id,
        date,
        startTime: minutesToTime(
          timeToMinutes(dayHours[0]) + Math.floor(rand() * 14) * 30,
        ),
        status: "confirmed",
        fromSlot: rand() > 0.7,
        deal: rand() > 0.85,
        cancellationReason: null,
      });
    }
  }
}

/* -------------------------------------------------------------------------- */

interface ApptInput {
  key: string;
  business: Business;
  service: Service;
  staff: Staff;
  customerId: string;
  date: DateOnly;
  startTime: string;
  status: Appointment["status"];
  fromSlot: boolean;
  deal: boolean;
  cancellationReason: string | null;
}

function pushAppointment(c: Catalog, input: ApptInput): Appointment {
  const { business, service, staff, date, startTime } = input;
  const rand = seededRandom(`appt-${input.key}`);
  const discount = input.deal ? [10, 15, 20, 25][Math.floor(rand() * 4)] : 0;
  const subtotal = discount
    ? Math.max(100, Math.round((service.price_cents * (1 - discount / 100)) / 100) * 100)
    : service.price_cents;
  const money = priceBooking(subtotal, business, DEFAULT_PLATFORM_SETTINGS);
  const id = stableId("appointment", input.key);
  const createdAt = `${addDays(date, -1 - Math.floor(rand() * 5))}T15:00:00.000Z`;

  const appointment: Appointment = {
    id,
    reference: referenceFor(input.key),
    business_id: business.id,
    customer_id: input.customerId,
    staff_id: staff.id,
    slot_id: input.fromSlot ? stableId("slot-historic", input.key) : null,
    date,
    start_time: startTime,
    end_time: addMinutes(startTime, service.duration_minutes),
    status: input.status,
    from_open_slot: input.fromSlot,
    is_last_minute_deal: discount > 0,
    subtotal_cents: money.subtotal_cents,
    service_fee_cents: money.service_fee_cents,
    total_cents: money.total_cents,
    commission_bps: money.commission_bps,
    commission_cents: money.commission_cents,
    payout_cents: money.payout_cents,
    customer_note: null,
    business_note: null,
    cancellation_reason: input.cancellationReason,
    cancelled_at: input.cancellationReason ? `${addDays(date, -1)}T18:00:00.000Z` : null,
    created_at: createdAt,
    updated_at: createdAt,
  };
  c.appointments.push(appointment);

  c.appointmentServices.push({
    id: stableId("appointment-service", input.key),
    appointment_id: id,
    service_id: service.id,
    price_cents: subtotal,
    list_price_cents: service.price_cents,
    duration_minutes: service.duration_minutes,
  });

  const settled = input.status === "completed" || input.status === "no_show";
  if (settled || input.status === "confirmed") {
    c.payments.push({
      id: stableId("payment", input.key),
      appointment_id: id,
      customer_id: input.customerId,
      business_id: business.id,
      amount_cents: money.total_cents,
      platform_fee_cents: money.commission_cents + money.service_fee_cents,
      payout_cents: money.payout_cents,
      refunded_cents: 0,
      status: "succeeded",
      stripe_payment_intent_id: null,
      payment_method_brand: pick(["Visa", "Mastercard", "Amex", "Apple Pay"], rand),
      payment_method_last4: `${1000 + Math.floor(rand() * 8999)}`.slice(-4),
      created_at: createdAt,
    });
  }

  return appointment;
}

function referenceFor(key: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = seededRandom(`ref-${key}`);
  return `NOW-${Array.from({ length: 4 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("")}`;
}

/* -------------------------------------------------------------------------- */
/* Maya's account: favourites, threads, notifications                          */
/* -------------------------------------------------------------------------- */

function buildMayaJourney(c: Catalog, anchor: DateOnly) {
  const luxe = c.businesses.find((b) => b.slug === DEMO_BUSINESS_SLUG)!;
  const modern = c.businesses.find((b) => b.slug === "modern-cuts")!;
  const ember = c.businesses.find((b) => b.slug === "ember-hair-lab")!;
  const stillwater = c.businesses.find((b) => b.slug === "stillwater-massage")!;

  // Favourites
  [luxe, modern, stillwater].forEach((b, i) => {
    c.favorites.push({
      id: stableId("favorite", `maya-${b.slug}`),
      customer_id: DEMO_CUSTOMER_ID,
      business_id: b.id,
      alert_on_opening: i < 2,
      created_at: `${addDays(anchor, -120 + i * 20)}T12:00:00.000Z`,
    });
  });

  // Past bookings for Maya
  const history: Array<[Business, number, number, Appointment["status"]]> = [
    [luxe, 0, 24, "completed"],
    [modern, 0, 52, "completed"],
    [ember, 3, 78, "completed"],
    [luxe, 2, 96, "cancelled_by_customer"],
    [stillwater, 1, 140, "completed"],
  ];
  history.forEach(([business, serviceIndex, daysAgo, status], i) => {
    const services = c.services.filter((s) => s.business_id === business.id);
    const staff = c.staff.filter((s) => s.business_id === business.id);
    pushAppointment(c, {
      key: `maya-past-${i}`,
      business,
      service: services[serviceIndex] ?? services[0],
      staff: staff[i % staff.length],
      customerId: DEMO_CUSTOMER_ID,
      date: addDays(anchor, -daysAgo),
      startTime: ["14:30", "11:00", "16:00", "13:00", "18:00"][i],
      status,
      fromSlot: i % 2 === 0,
      deal: i === 0,
      cancellationReason: status === "cancelled_by_customer" ? CANCEL_REASONS[0] : null,
    });
  });

  // Maya left one review already
  const luxePast = c.appointments.find(
    (a) => a.customer_id === DEMO_CUSTOMER_ID && a.business_id === luxe.id && a.status === "completed",
  );
  if (luxePast) {
    const existing = c.reviews.find((r) => r.appointment_id === luxePast.id);
    if (!existing) {
      c.reviews.push({
        id: stableId("review", "maya-luxe"),
        appointment_id: luxePast.id,
        business_id: luxe.id,
        customer_id: DEMO_CUSTOMER_ID,
        staff_id: luxePast.staff_id,
        rating: 5,
        body: "Grabbed a last-minute opening on my lunch break. Fast, spotless, and the gel lasted three weeks.",
        photo_seeds: [],
        business_reply: "Thank you Maya! See you next time.",
        business_replied_at: `${addDays(anchor, -23)}T10:00:00.000Z`,
        is_reported: false,
        report_reason: null,
        is_hidden: false,
        created_at: `${addDays(anchor, -24)}T20:00:00.000Z`,
      });
    }
  }

  // Upcoming booking — tomorrow at 11:00 with Modern Cuts
  const modernServices = c.services.filter((s) => s.business_id === modern.id);
  const modernStaff = c.staff.filter((s) => s.business_id === modern.id);
  const upcoming = pushAppointment(c, {
    key: "maya-upcoming-1",
    business: modern,
    service: modernServices[0],
    staff: modernStaff[0],
    customerId: DEMO_CUSTOMER_ID,
    date: addDays(anchor, 1),
    startTime: "11:00",
    status: "confirmed",
    fromSlot: true,
    deal: false,
    cancellationReason: null,
  });

  // A second upcoming booking later in the week
  const emberServices = c.services.filter((s) => s.business_id === ember.id);
  const emberStaff = c.staff.filter((s) => s.business_id === ember.id);
  pushAppointment(c, {
    key: "maya-upcoming-2",
    business: ember,
    service: emberServices[1],
    staff: emberStaff[1],
    customerId: DEMO_CUSTOMER_ID,
    date: addDays(anchor, 5),
    startTime: "17:30",
    status: "confirmed",
    fromSlot: false,
    deal: false,
    cancellationReason: null,
  });

  /* ---- Message threads --------------------------------------------------- */

  const thread1: MessageThread = {
    id: stableId("thread", "maya-modern"),
    business_id: modern.id,
    customer_id: DEMO_CUSTOMER_ID,
    appointment_id: upcoming.id,
    last_message_at: `${anchor}T08:40:00.000Z`,
    unread_for_customer: 1,
    unread_for_business: 0,
    created_at: `${addDays(anchor, -1)}T15:00:00.000Z`,
  };
  c.threads.push(thread1);
  c.messages.push(
    {
      id: stableId("message", "m1"),
      thread_id: thread1.id,
      sender_role: "system",
      sender_id: null,
      body: `Booking confirmed — Haircut with ${modernStaff[0].full_name}, tomorrow at 11:00 AM.`,
      created_at: `${addDays(anchor, -1)}T15:00:00.000Z`,
    },
    {
      id: stableId("message", "m2"),
      thread_id: thread1.id,
      sender_role: "customer",
      sender_id: DEMO_CUSTOMER_ID,
      body: "Hi — any chance I could move to 11:30? Meeting might run over.",
      created_at: `${anchor}T08:32:00.000Z`,
    },
    {
      id: stableId("message", "m3"),
      thread_id: thread1.id,
      sender_role: "business",
      sender_id: null,
      body: "No problem, we've got 11:30 open with Alex. Want me to switch it?",
      created_at: `${anchor}T08:40:00.000Z`,
    },
  );

  const luxeThread: MessageThread = {
    id: stableId("thread", "maya-luxe"),
    business_id: luxe.id,
    customer_id: DEMO_CUSTOMER_ID,
    appointment_id: luxePast?.id ?? null,
    last_message_at: `${addDays(anchor, -24)}T13:55:00.000Z`,
    unread_for_customer: 0,
    unread_for_business: 0,
    created_at: `${addDays(anchor, -24)}T13:40:00.000Z`,
  };
  c.threads.push(luxeThread);
  c.messages.push(
    {
      id: stableId("message", "m4"),
      thread_id: luxeThread.id,
      sender_role: "customer",
      sender_id: DEMO_CUSTOMER_ID,
      body: "Hi, I'm running about 5 minutes late.",
      created_at: `${addDays(anchor, -24)}T13:52:00.000Z`,
    },
    {
      id: stableId("message", "m5"),
      thread_id: luxeThread.id,
      sender_role: "business",
      sender_id: null,
      body: "No problem, see you soon!",
      created_at: `${addDays(anchor, -24)}T13:55:00.000Z`,
    },
  );

  // Business-side threads so the demo dashboard inbox isn't empty.
  const luxeCustomers = c.appointments
    .filter((a) => a.business_id === luxe.id && a.date >= anchor)
    .slice(0, 4);
  luxeCustomers.forEach((appt, i) => {
    if (appt.customer_id === DEMO_CUSTOMER_ID) return;
    const t: MessageThread = {
      id: stableId("thread", `luxe-${i}`),
      business_id: luxe.id,
      customer_id: appt.customer_id,
      appointment_id: appt.id,
      last_message_at: `${anchor}T0${7 + i}:15:00.000Z`,
      unread_for_customer: 0,
      unread_for_business: i < 2 ? 1 : 0,
      created_at: `${addDays(anchor, -2)}T12:00:00.000Z`,
    };
    c.threads.push(t);
    const bodies = [
      "Hi! Could I add nail art to my appointment?",
      "Is parking easier on Spruce or Locust?",
      "Running about ten minutes behind, sorry!",
      "Do you have anything earlier on Friday?",
    ];
    c.messages.push({
      id: stableId("message", `luxe-msg-${i}`),
      thread_id: t.id,
      sender_role: "customer",
      sender_id: appt.customer_id,
      body: bodies[i % bodies.length],
      created_at: t.last_message_at,
    });
  });

  /* ---- Notifications ----------------------------------------------------- */

  const notes: Array<[AppNotification["kind"], string, string, string | null, number]> = [
    ["reminder", "Your appointment starts in 1 hour", `${modern.name} · Haircut with ${modernStaff[0].full_name}`, "/bookings", 60],
    ["opening", `${modern.name} just opened a 4:30 PM appointment`, "One of your favourites has same-day availability.", `/business/${modern.slug}`, 180],
    ["deal", "A nail appointment near you dropped to $45", `${luxe.name} · Gel Manicure, today`, "/deals", 320],
    ["booking", "You're booked for tomorrow at 11:00 AM", `${modern.name} · Haircut`, "/bookings", 1440],
    ["review", "How was your appointment?", `Leave a review for ${stillwater.name}`, "/bookings?tab=past", 2880],
  ];
  notes.forEach(([kind, title, body, href, minsAgo], i) => {
    c.notifications.push({
      id: stableId("notification", `maya-${i}`),
      user_id: DEMO_CUSTOMER_ID,
      kind,
      title,
      body,
      href,
      read_at: i > 2 ? `${anchor}T09:00:00.000Z` : null,
      created_at: new Date(
        parseDateOnly(anchor).getTime() + 12 * 3600_000 - minsAgo * 60_000,
      ).toISOString(),
    });
  });

  const bizNotes: Array<[AppNotification["kind"], string, string, string | null]> = [
    ["booking", "Your 2:30 PM opening was booked", "Maya E. booked a Gel Manicure at a 20% opening price.", "/dashboard/bookings"],
    ["review", "New 5-star review", "\"Cleanest nail studio I've been to in the city.\"", "/dashboard/reviews"],
    ["payout", "Payout on the way", "Your weekly payout is in transit to your bank.", "/dashboard/payments"],
    ["message", "New message from a customer", "\"Could I add nail art to my appointment?\"", "/dashboard/messages"],
  ];
  bizNotes.forEach(([kind, title, body, href], i) => {
    c.notifications.push({
      id: stableId("notification", `luxe-${i}`),
      user_id: DEMO_BUSINESS_OWNER_ID,
      kind,
      title,
      body,
      href,
      read_at: i > 1 ? `${anchor}T09:00:00.000Z` : null,
      created_at: new Date(
        parseDateOnly(anchor).getTime() + 11 * 3600_000 - i * 47 * 60_000,
      ).toISOString(),
    });
  });
}

function buildDisputes(c: Catalog, anchor: DateOnly) {
  const cancelled = c.appointments.filter((a) => a.status === "cancelled_by_business").slice(0, 3);
  const reasons: Array<[Dispute["kind"], string, string, Dispute["status"]]> = [
    ["refund_request", "Business cancelled last minute", "Salon cancelled 40 minutes before my appointment and I'd already paid.", "open"],
    ["booking_dispute", "Service not as described", "I booked a 60-minute deep tissue and the session ran 40 minutes.", "under_review"],
    ["reported_customer", "Repeated no-shows", "This customer has missed three booked appointments in a month.", "resolved"],
  ];
  cancelled.forEach((appt, i) => {
    const [kind, reason, detail, status] = reasons[i % reasons.length];
    c.disputes.push({
      id: stableId("dispute", `d-${i}`),
      kind,
      appointment_id: appt.id,
      business_id: appt.business_id,
      customer_id: appt.customer_id,
      review_id: null,
      opened_by_role: kind === "reported_customer" ? "business" : "customer",
      reason,
      detail,
      status,
      resolution_note: status === "resolved" ? "Customer warned; no further action." : null,
      amount_in_question_cents: kind === "refund_request" ? appt.total_cents : null,
      created_at: `${addDays(anchor, -3 - i * 4)}T16:00:00.000Z`,
      resolved_at: status === "resolved" ? `${addDays(anchor, -1)}T10:00:00.000Z` : null,
    });
  });

  // One reported review for the admin queue.
  const target = c.reviews.find((r) => r.rating <= 4);
  if (target) {
    target.is_reported = true;
    target.report_reason = "Business claims this review is about a different location.";
    c.disputes.push({
      id: stableId("dispute", "review-report"),
      kind: "reported_review",
      appointment_id: target.appointment_id,
      business_id: target.business_id,
      customer_id: target.customer_id,
      review_id: target.id,
      opened_by_role: "business",
      reason: "Review may reference another business",
      detail: target.report_reason,
      status: "open",
      resolution_note: null,
      amount_in_question_cents: null,
      created_at: `${addDays(anchor, -2)}T09:30:00.000Z`,
      resolved_at: null,
    });
  }
}

function buildPayouts(c: Catalog, anchor: DateOnly) {
  c.businesses.forEach((business, bi) => {
    for (let w = 1; w <= 6; w++) {
      const periodEnd = addDays(anchor, -(w - 1) * 7 - 1);
      const periodStart = addDays(periodEnd, -6);
      const earned = c.appointments
        .filter(
          (a) =>
            a.business_id === business.id &&
            a.date >= periodStart &&
            a.date <= periodEnd &&
            (a.status === "completed" || a.status === "no_show"),
        )
        .reduce((sum, a) => sum + a.payout_cents, 0);
      if (earned === 0) continue;
      c.payouts.push({
        id: stableId("payout", `${business.slug}-${w}`),
        business_id: business.id,
        amount_cents: earned,
        status: w === 1 ? "in_transit" : "paid",
        period_start: periodStart,
        period_end: periodEnd,
        arrival_date: addDays(periodEnd, 2),
        stripe_payout_id: null,
        created_at: `${addDays(periodEnd, 1)}T06:00:00.000Z`,
      });
    }
    void bi;
  });
}

export const ALL_CITIES = CITIES;
