import type { NextConfig } from "next";

/**
 * Two build targets:
 *
 *   npm run build          full Next.js — server-rendered Google reviews and a
 *                          working /api/booking endpoint. Use this on Netlify
 *                          via Git or the CLI (netlify.toml wires it up).
 *
 *   npm run build:static   static export into out/ — a folder you can drag
 *                          straight onto Netlify. No API route, and reviews
 *                          are fetched once at build time instead of hourly.
 */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const, trailingSlash: true } : {}),

  images: {
    // The export target has no image optimiser behind it.
    ...(isStaticExport
      ? { unoptimized: true }
      : { formats: ["image/avif", "image/webp"] as ("image/avif" | "image/webp")[] }),
    remotePatterns: [
      // Delivery hosts for generated art — lets an image be referenced
      // directly from the manifest before it is downloaded into /public.
      { protocol: "https", hostname: "**.higgsfield.ai" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },

  poweredByHeader: false,
};

export default nextConfig;
