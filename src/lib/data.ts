import { media, type MediaAsset } from "@/lib/media";

/* ────────────────────────────────────────────────────────────
   Ashgrove Barber Co. — single source of truth for site copy.
   Fictional demo business; numbers reserved for fiction.
   ──────────────────────────────────────────────────────────── */

export const shop = {
  name: "Ashgrove Barber Co.",
  shortName: "Ashgrove",
  tagline: "Precision Cuts. Elevated Style.",
  description:
    "A Shoreditch barbershop built on quiet craft — precision cutting, sharp beard work and an unhurried chair.",
  street: "42 Calder Row",
  district: "Shoreditch",
  city: "London",
  postcode: "E2 7NX",
  country: "United Kingdom",
  phone: "+44 20 7946 0318",
  phoneHref: "tel:+442079460318",
  email: "hello@ashgrovebarber.co",
  founded: 2013,
  geo: { lat: 51.5265, lng: -0.0755 },
  mapsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=42+Calder+Row+Shoreditch+London+E2+7NX",
  osmEmbed:
    "https://www.openstreetmap.org/export/embed.html?bbox=-0.0835%2C51.5225%2C-0.0675%2C51.5305&layer=mapnik&marker=51.5265%2C-0.0755",
} as const;

export const addressLines = [
  shop.street,
  `${shop.district}, ${shop.city}`,
  shop.postcode,
];

/* ── Hours ─────────────────────────────────────────────────── */

export type Hours = {
  /** 0 = Sunday, matching Date#getDay(). */
  day: number;
  label: string;
  short: string;
  open: string | null;
  close: string | null;
};

export const hours: Hours[] = [
  { day: 1, label: "Monday", short: "Mon", open: "09:00", close: "19:00" },
  { day: 2, label: "Tuesday", short: "Tue", open: "09:00", close: "19:00" },
  { day: 3, label: "Wednesday", short: "Wed", open: "09:00", close: "19:00" },
  { day: 4, label: "Thursday", short: "Thu", open: "09:00", close: "20:00" },
  { day: 5, label: "Friday", short: "Fri", open: "09:00", close: "20:00" },
  { day: 6, label: "Saturday", short: "Sat", open: "08:30", close: "18:00" },
  { day: 0, label: "Sunday", short: "Sun", open: null, close: null },
];

/** Groups consecutive days that share hours, e.g. "Mon – Wed · 9:00–19:00". */
export const hoursSummary = (() => {
  const ordered = [...hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  const groups: { days: string; time: string }[] = [];

  for (const entry of ordered) {
    const time = entry.open && entry.close ? `${entry.open} – ${entry.close}` : "Closed";
    const last = groups.at(-1);
    if (last && last.time === time) {
      last.days = `${last.days.split(" – ")[0]} – ${entry.short}`;
    } else {
      groups.push({ days: entry.short, time });
    }
  }
  return groups;
})();

/* ── Services ──────────────────────────────────────────────── */

export type Service = {
  id: string;
  index: string;
  name: string;
  blurb: string;
  minutes: number;
  price: number;
  image: MediaAsset;
  imageAlt: string;
  /** Marks the package row that gets the burgundy treatment. */
  feature?: boolean;
};

export const services: Service[] = [
  {
    id: "signature-haircut",
    index: "01",
    name: "Signature Haircut",
    blurb: "Consultation, scissor-and-clipper cut, hot towel and a finish styled to your hair.",
    minutes: 45,
    price: 42,
    image: media["cut-classic"],
    imageAlt: "Classic scissor-cut side part finished at Ashgrove Barber Co.",
  },
  {
    id: "skin-fade",
    index: "02",
    name: "Skin Fade",
    blurb: "A seamless blend from skin, with a sharp freehand lineup through the temples.",
    minutes: 45,
    price: 40,
    image: media["cut-skin-fade"],
    imageAlt: "High skin fade with a sharp lineup, seen in profile",
  },
  {
    id: "haircut-and-beard",
    index: "03",
    name: "Haircut and Beard",
    blurb: "The full reset — precision cut paired with a shaped, oiled and edged beard.",
    minutes: 70,
    price: 62,
    image: media["ba-fade-after"],
    imageAlt: "Fresh mid fade paired with a sculpted beard",
  },
  {
    id: "beard-sculpting",
    index: "04",
    name: "Beard Sculpting",
    blurb: "Cheek lines mapped to your jaw, trimmed to length and finished with warm oil.",
    minutes: 30,
    price: 28,
    image: media["cut-beard"],
    imageAlt: "Close detail of a freshly sculpted beard with a crisp cheek line",
  },
  {
    id: "kids-cut",
    index: "05",
    name: "Kids Cut",
    blurb: "An unhurried first-chair experience for under-12s, at their pace.",
    minutes: 30,
    price: 24,
    image: media["cut-texture"],
    imageAlt: "Soft textured crop with a clean taper at the neckline",
  },
  {
    id: "premium-grooming",
    index: "06",
    name: "Premium Grooming Package",
    blurb: "Cut, beard sculpt and a traditional hot towel straight razor finish.",
    minutes: 90,
    price: 88,
    image: media["cut-shave"],
    imageAlt: "Hot towel straight razor shave with a copper lather bowl",
    feature: true,
  },
];

export const serviceById = (id: string) => services.find((s) => s.id === id);

/* ── Barbers ───────────────────────────────────────────────── */

export type Barber = {
  id: string;
  index: string;
  name: string;
  role: string;
  specialty: string;
  since: number;
  bio: string;
  image: MediaAsset;
  imageAlt: string;
  /** Days of the week this barber takes the chair. */
  worksOn: number[];
  /** Services this barber does not cover. */
  excludes?: string[];
};

export const barbers: Barber[] = [
  {
    id: "marcus",
    index: "01",
    name: "Marcus Vale",
    role: "Founder · Master Barber",
    specialty: "Classic cuts & razor work",
    since: 2005,
    bio: "Opened Ashgrove in 2013 after eight years on Jermyn Street. Cuts slowly, talks less, finishes clean.",
    image: media["barber-marcus"],
    imageAlt: "Marcus Vale, founder and master barber, in a navy apron",
    worksOn: [1, 2, 3, 4, 5, 6],
  },
  {
    id: "elias",
    index: "02",
    name: "Elias Moreau",
    role: "Senior Barber",
    specialty: "Scissor work & texture",
    since: 2011,
    bio: "Trained in Lyon. Reads hair growth before he picks up the shears — every cut is dry-checked twice.",
    image: media["barber-elias"],
    imageAlt: "Elias Moreau, senior barber, holding barber shears",
    worksOn: [2, 3, 4, 5, 6],
  },
  {
    id: "deniz",
    index: "03",
    name: "Deniz Kaya",
    role: "Barber",
    specialty: "Skin fades & lineups",
    since: 2015,
    bio: "Freehand fade specialist. Learned the trade in his father's shop in Kadıköy and never lost the speed.",
    image: media["barber-deniz"],
    imageAlt: "Deniz Kaya, barber, seated in a barber chair",
    worksOn: [1, 3, 4, 5, 6],
  },
  {
    id: "jonah",
    index: "04",
    name: "Jonah Reyes",
    role: "Barber · Beard Specialist",
    specialty: "Curls & beard sculpting",
    since: 2017,
    bio: "The one to see for curl patterns and beards that need a plan rather than a trim.",
    image: media["barber-jonah"],
    imageAlt: "Jonah Reyes, barber and beard specialist, holding a comb",
    worksOn: [1, 2, 4, 5, 6],
    excludes: ["kids-cut"],
  },
];

export const barberById = (id: string) => barbers.find((b) => b.id === id);

export const yearsOfExperience = (since: number) => new Date().getFullYear() - since;

/* ── Gallery ───────────────────────────────────────────────── */

export type GalleryCategory = "fades" | "classic" | "beards" | "shop";

export const galleryCategories: { id: GalleryCategory | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "fades", label: "Fades" },
  { id: "classic", label: "Classic" },
  { id: "beards", label: "Beards" },
  { id: "shop", label: "The Shop" },
];

export type GalleryItem = {
  id: string;
  category: GalleryCategory;
  title: string;
  caption: string;
  image: MediaAsset;
  alt: string;
  /** Layout weight in the masonry composition. */
  span: "tall" | "wide" | "feature" | "square";
  /** Where to anchor the crop — portraits keep the head, rooms stay centred. */
  focal?: "top" | "center";
  compare?: { before: MediaAsset; after: MediaAsset; beforeAlt: string; afterAlt: string };
};

/**
 * Ordered so the dense grid packs without holes: a 2×2 feature, two tall
 * portraits, two landscape bands, a second feature, then a tall and two
 * squares. Spans are matched to each photograph's orientation so nothing
 * important gets cropped away.
 */
export const gallery: GalleryItem[] = [
  {
    id: "fade-transformation",
    category: "fades",
    title: "Grown out to mid fade",
    caption: "Six weeks of growth taken back to a mid skin fade and a mapped beard.",
    image: media["ba-fade-after"],
    alt: "Client after a mid skin fade and sculpted beard",
    span: "feature",
    focal: "top",
    compare: {
      before: media["ba-fade-before"],
      after: media["ba-fade-after"],
      beforeAlt: "Client before his appointment, hair grown out over the ears",
      afterAlt: "The same client after a mid skin fade and sculpted beard",
    },
  },
  {
    id: "high-skin-fade",
    category: "fades",
    title: "High skin fade",
    caption: "Blended from skin with a freehand lineup.",
    image: media["cut-skin-fade"],
    alt: "High skin fade with a sharp lineup, seen in profile",
    span: "tall",
    focal: "top",
  },
  {
    id: "classic-transformation",
    category: "classic",
    title: "Long to tailored side part",
    caption: "Shoulder-length hair cut back to a tailored side part with a shaped beard.",
    image: media["ba-classic-after"],
    alt: "Client after a tailored side part and shaped beard",
    span: "tall",
    focal: "top",
    compare: {
      before: media["ba-classic-before"],
      after: media["ba-classic-after"],
      beforeAlt: "Client before his appointment with long hair and an untrimmed beard",
      afterAlt: "The same client after a tailored side part and shaped beard",
    },
  },
  {
    id: "scissor-side-part",
    category: "classic",
    title: "Scissor side part",
    caption: "Cut dry, combed matte, no product shine.",
    image: media["cut-classic"],
    alt: "Classic scissor-cut side part in a steel blue barber chair",
    span: "wide",
    focal: "center",
  },
  {
    id: "hot-towel",
    category: "shop",
    title: "Hot towel finish",
    caption: "The last five minutes of the Premium Grooming Package.",
    image: media["cut-shave"],
    alt: "Hot towel straight razor shave with a copper lather bowl",
    span: "wide",
    focal: "center",
  },
  {
    id: "the-floor",
    category: "shop",
    title: "The floor",
    caption: "Four chairs, arched mirrors, no rush.",
    image: media["hero-interior"],
    alt: "The Ashgrove Barber Co. floor with navy panelling and copper-framed mirrors",
    span: "feature",
    focal: "center",
  },
  {
    id: "textured-crop",
    category: "fades",
    title: "Textured crop",
    caption: "Hand-cut texture over a low taper.",
    image: media["cut-texture"],
    alt: "Textured crop with a low taper at the neckline",
    span: "tall",
    focal: "top",
  },
  {
    id: "beard-sculpt",
    category: "beards",
    title: "Sculpted full beard",
    caption: "Cheek line mapped to the jaw, finished with warm oil.",
    image: media["cut-beard"],
    alt: "Close detail of a freshly sculpted full beard",
    span: "square",
    focal: "center",
  },
  {
    id: "at-the-chair",
    category: "shop",
    title: "At the chair",
    caption: "Shears, comb, and a dry cross-check.",
    image: media["about-craft"],
    alt: "A barber cutting a client's hair with shears and comb",
    span: "square",
    focal: "top",
  },
];

/* ── Reviews ───────────────────────────────────────────────── */

export type Review = {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  serviceId: string;
  barberId: string;
  date: string;
  body: string;
  highlight?: boolean;
};

export const reviews: Review[] = [
  {
    id: "r1",
    name: "Daniel",
    rating: 5,
    serviceId: "skin-fade",
    barberId: "deniz",
    date: "2026-07-24",
    body: "Cleanest fade I've had in London. Deniz took his time on the lineup and it still looked sharp three weeks later.",
    highlight: true,
  },
  {
    id: "r2",
    name: "Priya",
    rating: 5,
    serviceId: "kids-cut",
    barberId: "marcus",
    date: "2026-07-19",
    body: "Booked my son in, first haircut he hasn't cried through. Marcus let him hold the comb the whole time.",
    highlight: true,
  },
  {
    id: "r3",
    name: "Tom",
    rating: 5,
    serviceId: "premium-grooming",
    barberId: "marcus",
    date: "2026-07-11",
    body: "The full package before my wedding. The hot towel shave alone was worth the booking.",
    highlight: true,
  },
  {
    id: "r4",
    name: "Andre",
    rating: 5,
    serviceId: "haircut-and-beard",
    barberId: "jonah",
    date: "2026-07-05",
    body: "Jonah actually understands curls. First barber who asked how I sleep on it before cutting.",
  },
  {
    id: "r5",
    name: "Ollie",
    rating: 4,
    serviceId: "signature-haircut",
    barberId: "elias",
    date: "2026-06-28",
    body: "Great cut and a proper consultation. Ran about ten minutes late, but they were honest about it at the door.",
  },
  {
    id: "r6",
    name: "Sam",
    rating: 5,
    serviceId: "beard-sculpting",
    barberId: "jonah",
    date: "2026-06-21",
    body: "Had a patchy jawline I'd given up on. He reshaped the cheek line and it looks twice as full.",
  },
  {
    id: "r7",
    name: "Marcus",
    rating: 5,
    serviceId: "signature-haircut",
    barberId: "elias",
    date: "2026-06-14",
    body: "Elias dry-checks everything twice. You can see the difference in how it grows out.",
  },
  {
    id: "r8",
    name: "Chris",
    rating: 4,
    serviceId: "skin-fade",
    barberId: "deniz",
    date: "2026-06-02",
    body: "Sharp work and a good chair. Shop gets busy on Saturdays, so book ahead.",
  },
  {
    id: "r9",
    name: "Femi",
    rating: 5,
    serviceId: "haircut-and-beard",
    barberId: "deniz",
    date: "2026-05-27",
    body: "Been coming for two years. Same standard every single visit, which is the hard part.",
  },
  {
    id: "r10",
    name: "Ravi",
    rating: 5,
    serviceId: "premium-grooming",
    barberId: "marcus",
    date: "2026-05-16",
    body: "Ninety unhurried minutes. Left feeling like I'd been somewhere, not just had a haircut.",
  },
  {
    id: "r11",
    name: "Joe",
    rating: 4,
    serviceId: "beard-sculpting",
    barberId: "elias",
    date: "2026-05-08",
    body: "Neat, quick and no upselling. Would have liked a little more length left on the moustache.",
  },
  {
    id: "r12",
    name: "Hassan",
    rating: 5,
    serviceId: "signature-haircut",
    barberId: "marcus",
    date: "2026-04-30",
    body: "Walked in unsure what I wanted. Walked out with the best cut I've had in years.",
  },
  {
    id: "r13",
    name: "Leo",
    rating: 5,
    serviceId: "kids-cut",
    barberId: "elias",
    date: "2026-04-22",
    body: "Twins, back to back, both happy. That has never happened anywhere else.",
  },
  {
    id: "r14",
    name: "Nathan",
    rating: 5,
    serviceId: "skin-fade",
    barberId: "jonah",
    date: "2026-04-09",
    body: "Asked for something between a taper and a fade and he nailed it first time.",
  },
  {
    id: "r15",
    name: "Alex",
    rating: 4,
    serviceId: "haircut-and-beard",
    barberId: "marcus",
    date: "2026-03-30",
    body: "Solid cut, warm shop, decent coffee. Parking nearby is the only faff.",
  },
];

export const reviewStats = (list: Review[] = reviews) => {
  const total = list.length;
  const sum = list.reduce((acc, r) => acc + r.rating, 0);
  const distribution = ([5, 4, 3, 2, 1] as const).map((stars) => {
    const count = list.filter((r) => r.rating === stars).length;
    return { stars, count, percent: total ? Math.round((count / total) * 100) : 0 };
  });
  return {
    total,
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    distribution,
  };
};

export const highlightedReviews = reviews.filter((r) => r.highlight);

/* ── Misc site copy ────────────────────────────────────────── */

export const navLinks = [
  { href: "/#top", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#barbers", label: "Barbers" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#booking", label: "Booking" },
  { href: "/#contact", label: "Contact" },
];

export const socials = [
  { label: "Instagram", href: "https://instagram.com", handle: "@ashgrovebarber" },
  { label: "Facebook", href: "https://facebook.com", handle: "Ashgrove Barber Co." },
  { label: "TikTok", href: "https://tiktok.com", handle: "@ashgrovebarber" },
];

export const parkingInfo = [
  "Calder Row is metered Mon–Sat, 08:00–18:30, with a two-hour maximum stay.",
  "Free after 18:30 and all day Sunday.",
  "Ellingham multi-storey is a four-minute walk on Prospect Street.",
];

export const transitInfo = [
  "Hoxton Overground — 6 minutes on foot.",
  "Old Street (Northern line) — 11 minutes on foot.",
  "Buses 26, 48 and 55 stop on Calder Row.",
];
