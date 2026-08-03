import {
  addressLines,
  barbers,
  hours,
  reviewStats,
  reviews,
  services,
  shop,
  socials,
} from "@/lib/data";
import { serviceById, barberById } from "@/lib/data";

const stats = reviewStats();
const siteUrl = "https://ashgrovebarber.co";

/** schema.org HairSalon — generated from the same data that renders the page. */
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${siteUrl}/#business`,
  name: shop.name,
  description: shop.description,
  url: siteUrl,
  telephone: shop.phone,
  email: shop.email,
  image: `${siteUrl}/images/og-cover.webp`,
  priceRange: "££",
  currenciesAccepted: "GBP",
  foundingDate: `${shop.founded}`,
  address: {
    "@type": "PostalAddress",
    streetAddress: shop.street,
    addressLocality: shop.city,
    addressRegion: shop.district,
    postalCode: shop.postcode,
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: shop.geo.lat,
    longitude: shop.geo.lng,
  },
  sameAs: socials.map((s) => s.href),
  openingHoursSpecification: hours
    .filter((h) => h.open && h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${h.label}`,
      opens: h.open,
      closes: h.close,
    })),
  employee: barbers.map((b) => ({
    "@type": "Person",
    name: b.name,
    jobTitle: b.role,
    knowsAbout: b.specialty,
  })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Barbering services",
    itemListElement: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name, description: s.blurb },
      price: s.price,
      priceCurrency: "GBP",
    })),
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: stats.average,
    reviewCount: stats.total,
    bestRating: 5,
    worstRating: 1,
  },
  review: reviews.slice(0, 6).map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.name },
    datePublished: r.date,
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
    reviewBody: r.body,
    itemReviewed: {
      "@type": "Service",
      name: serviceById(r.serviceId)?.name ?? "Barbering",
      provider: { "@type": "Person", name: barberById(r.barberId)?.name },
    },
  })),
} as const;

export const breadcrumbSchema = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `${siteUrl}${item.path}`,
  })),
});

export const postalAddress = addressLines;
