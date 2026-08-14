import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://booknow.demo"),
  title: {
    default: "NOW — Available when you need it",
    template: "%s · NOW",
  },
  description:
    "Find local services with real availability today. Compare price, distance and rating, then book in a few taps.",
  applicationName: "NOW",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NOW",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "NOW",
    title: "NOW — Available when you need it",
    description:
      "Find local services with real availability today. Compare price, distance and rating, then book in a few taps.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOW — Available when you need it",
    description: "Book local services with real availability — without calling around.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#6C4DFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-canvas antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-brand-500 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
