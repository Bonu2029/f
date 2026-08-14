import type {
  AppNotification,
  Appointment,
  AppointmentService,
  Business,
  BusinessHours,
  BusinessMember,
  BusinessVerification,
  CustomerProfile,
  DateOnly,
  Dispute,
  Favorite,
  Message,
  MessageThread,
  OpenSlot,
  Payment,
  PaymentMethod,
  Payout,
  PlatformSettings,
  Review,
  Service,
  ServiceCategory,
  Staff,
  StaffAvailability,
  StaffService,
  User,
} from "../types";
import { DEFAULT_PLATFORM_SETTINGS } from "../config";
import { buildCatalog, type Catalog } from "../data/catalog";
import { generateAvailability } from "../data/availability";
import { toDateOnly } from "../time";

/** The in-memory database the whole app reads from. */
export interface MarketplaceState {
  anchor: DateOnly;
  /** Epoch milliseconds, ticked once a minute so "available now" stays true. */
  now: number;
  settings: PlatformSettings;

  categories: ServiceCategory[];
  businesses: Business[];
  businessHours: BusinessHours[];
  businessMembers: BusinessMember[];
  verifications: BusinessVerification[];
  services: Service[];
  staff: Staff[];
  staffServices: StaffService[];
  staffAvailability: StaffAvailability[];

  users: User[];
  customerProfiles: CustomerProfile[];

  slots: OpenSlot[];
  appointments: Appointment[];
  appointmentServices: AppointmentService[];

  reviews: Review[];
  favorites: Favorite[];
  threads: MessageThread[];
  messages: Message[];
  notifications: AppNotification[];

  payments: Payment[];
  paymentMethods: PaymentMethod[];
  payouts: Payout[];
  disputes: Dispute[];
}

export function createInitialState(now: Date): MarketplaceState {
  const anchor = toDateOnly(now);
  const catalog: Catalog = buildCatalog(anchor);
  return {
    anchor,
    now: now.getTime(),
    settings: { ...DEFAULT_PLATFORM_SETTINGS },
    categories: catalog.categories.map((c) => ({ ...c })),
    businesses: catalog.businesses.map((b) => ({ ...b })),
    businessHours: [...catalog.businessHours],
    businessMembers: [...catalog.businessMembers],
    verifications: catalog.verifications.map((v) => ({ ...v })),
    services: [...catalog.services],
    staff: [...catalog.staff],
    staffServices: [...catalog.staffServices],
    staffAvailability: [...catalog.staffAvailability],
    users: [...catalog.users],
    customerProfiles: catalog.customerProfiles.map((p) => ({ ...p })),
    slots: generateAvailability(catalog, now),
    appointments: [...catalog.appointments],
    appointmentServices: [...catalog.appointmentServices],
    reviews: [...catalog.reviews],
    favorites: [...catalog.favorites],
    threads: [...catalog.threads],
    messages: [...catalog.messages],
    notifications: [...catalog.notifications],
    payments: [...catalog.payments],
    paymentMethods: [...catalog.paymentMethods],
    payouts: [...catalog.payouts],
    disputes: [...catalog.disputes],
  };
}

/* ---- Small helpers shared by the reducer -------------------------------- */

export function replace<T>(list: T[], match: (item: T) => boolean, update: (item: T) => T): T[] {
  let changed = false;
  const next = list.map((item) => {
    if (!match(item)) return item;
    changed = true;
    return update(item);
  });
  return changed ? next : list;
}

export function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((item) => item.id === id);
}
