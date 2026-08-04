import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { site, formattedAddress, hours, hasRealPhone } from "@/lib/site";
import { services } from "@/lib/services";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Luxury Hair & Beauty in ${site.address.locality}, ${site.address.region}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: [
    "hair salon Allentown",
    "balayage Allentown PA",
    "hair extensions Pennsylvania",
    "hair colour salon",
    "blowout",
    "nail salon Allentown",
    site.name,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Never block zoom — pinch-to-zoom is an accessibility feature.
  maximumScale: 5,
};

/** Schema.org — only facts that are actually verified get published. */
function structuredData() {
  const dayMap: Record<string, string> = {
    Monday: "Monday",
    Tuesday: "Tuesday",
    Wednesday: "Wednesday",
    Thursday: "Thursday",
    Friday: "Friday",
    Saturday: "Saturday",
    Sunday: "Sunday",
  };

  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: site.name,
    legalName: site.legalName,
    description: site.description,
    url: site.url,
    ...(hasRealPhone ? { telephone: site.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    openingHoursSpecification: hours
      .filter((d) => d.open && d.close)
      .map((d) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${dayMap[d.day]}`,
        opens: d.open,
        closes: d.close,
      })),
    sameAs: [site.social.instagram, site.social.facebook, site.google.profileUrl].filter(
      Boolean,
    ),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.blurb },
      })),
    },
    areaServed: {
      "@type": "City",
      name: `${site.address.locality}, ${site.address.region}`,
    },
    // Aggregate rating is intentionally omitted — it is pulled live from
    // Google at runtime and never hard-coded here.
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="grain relative antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-full focus:bg-graphite focus:px-5 focus:py-3 focus:text-cream"
        >
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          // Static, developer-authored JSON — no user input reaches this.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
          }}
        />
        <span className="sr-only">{formattedAddress}</span>
      </body>
    </html>
  );
}
