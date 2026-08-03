import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Preloader } from "@/components/layout/Preloader";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { StickyBookBar } from "@/components/layout/StickyBookBar";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { localBusinessSchema } from "@/lib/schema";
import { shop } from "@/lib/data";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

const siteUrl = "https://ashgrovebarber.co";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${shop.name} — Barbershop in ${shop.district}, ${shop.city}`,
    template: `%s · ${shop.name}`,
  },
  description:
    "Precision cuts, skin fades and beard sculpting in Shoreditch. Book your barber, date and time online in under a minute.",
  keywords: [
    "barbershop Shoreditch",
    "skin fade London",
    "beard trim Shoreditch",
    "men's haircut London",
    "hot towel shave",
    "book a barber online",
  ],
  authors: [{ name: shop.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: shop.name,
    title: `${shop.name} — ${shop.tagline}`,
    description:
      "A Shoreditch barbershop built on quiet craft. Four barbers, six services, online booking.",
    images: [
      {
        url: "/images/og-cover.webp",
        width: 1200,
        height: 630,
        alt: "The Ashgrove Barber Co. floor with navy panelling and copper-framed mirrors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${shop.name} — ${shop.tagline}`,
    description: "Precision cuts, skin fades and beard sculpting in Shoreditch, London.",
    images: ["/images/og-cover.webp"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1a2b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${playfair.variable} ${inter.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          // Structured data is generated from the same source as the page copy.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <SmoothScroll />
        <Preloader />
        <CustomCursor />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <StickyBookBar />
      </body>
    </html>
  );
}
