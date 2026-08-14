import type { ServiceCategory } from "../types";
import { stableId } from "../utils";

/**
 * Service categories. `synonyms` power keyword search, so adding a category is
 * a data change — no code change anywhere in the search pipeline.
 */
const RAW: Omit<ServiceCategory, "id">[] = [
  {
    slug: "haircut",
    name: "Haircut",
    plural_name: "Haircuts",
    icon: "scissors",
    synonyms: ["haircut", "hair cut", "cut", "trim", "fade", "hair", "buzz", "lineup"],
    sort_order: 1,
    is_active: true,
  },
  {
    slug: "nails",
    name: "Nails",
    plural_name: "Nail Salons",
    icon: "sparkles",
    synonyms: ["nails", "nail", "manicure", "mani", "pedicure", "pedi", "gel", "acrylic", "dip"],
    sort_order: 2,
    is_active: true,
  },
  {
    slug: "barber",
    name: "Barber",
    plural_name: "Barbershops",
    icon: "scissors-line",
    synonyms: ["barber", "barbershop", "barber shop", "beard", "shave", "hot towel", "mens haircut"],
    sort_order: 3,
    is_active: true,
  },
  {
    slug: "hair-salon",
    name: "Hair Salon",
    plural_name: "Hair Salons",
    icon: "wand",
    synonyms: ["salon", "hair salon", "color", "colour", "balayage", "highlights", "blowout", "keratin"],
    sort_order: 4,
    is_active: true,
  },
  {
    slug: "massage",
    name: "Massage",
    plural_name: "Massage Studios",
    icon: "flower",
    synonyms: ["massage", "deep tissue", "swedish", "spa", "bodywork", "sports massage", "prenatal"],
    sort_order: 5,
    is_active: true,
  },
  {
    slug: "auto-detailing",
    name: "Auto Detailing",
    plural_name: "Auto Detailers",
    icon: "car",
    synonyms: ["detailing", "auto detailing", "car detailing", "car wash", "detail", "ceramic coating", "interior"],
    sort_order: 6,
    is_active: true,
  },
  {
    slug: "pet-grooming",
    name: "Pet Grooming",
    plural_name: "Pet Groomers",
    icon: "dog",
    synonyms: ["pet grooming", "dog groomer", "groomer", "dog", "puppy", "cat grooming", "nail trim"],
    sort_order: 7,
    is_active: true,
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    plural_name: "Cleaners",
    icon: "spray",
    synonyms: ["cleaning", "house cleaning", "cleaner", "maid", "deep clean", "move out", "apartment cleaning"],
    sort_order: 8,
    is_active: true,
  },
  {
    slug: "handyman",
    name: "Handyman",
    plural_name: "Handymen",
    icon: "wrench",
    synonyms: ["handyman", "repair", "fix", "install", "mount", "drywall", "plumbing", "assembly"],
    sort_order: 9,
    is_active: true,
  },
  {
    slug: "tutor",
    name: "Tutor",
    plural_name: "Tutors",
    icon: "graduation",
    synonyms: ["tutor", "tutoring", "math", "sat", "reading", "lesson", "homework", "test prep"],
    sort_order: 10,
    is_active: true,
  },
  {
    slug: "personal-trainer",
    name: "Personal Trainer",
    plural_name: "Personal Trainers",
    icon: "dumbbell",
    synonyms: ["personal trainer", "trainer", "training", "gym", "fitness", "workout", "strength"],
    sort_order: 11,
    is_active: true,
  },
  {
    slug: "photographer",
    name: "Photographer",
    plural_name: "Photographers",
    icon: "camera",
    synonyms: ["photographer", "photo", "photos", "headshot", "portrait", "shoot", "family photos"],
    sort_order: 12,
    is_active: true,
  },
];

export const CATEGORIES: ServiceCategory[] = RAW.map((c) => ({
  ...c,
  id: stableId("category", c.slug),
}));

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryBySlug(slug: string): ServiceCategory | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function categoryById(id: string): ServiceCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

/** Categories surfaced as chips on the home screen, in order. */
export const HOME_CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

/**
 * Public SEO pages use the plural form — /philadelphia/nail-salons reads
 * better and matches what people search for than /philadelphia/nails.
 */
export function categorySeoSlug(category: ServiceCategory): string {
  return category.plural_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function categoryBySeoSlug(slug: string): ServiceCategory | undefined {
  return CATEGORIES.find((c) => categorySeoSlug(c) === slug);
}
