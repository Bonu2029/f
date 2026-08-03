import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Every route here is prerendered, so the site ships as plain static files —
   * deployable to Cloudflare Pages, Netlify, GitHub Pages or any bucket.
   * `next build` writes them to `out/`.
   *
   * Static export has no image optimisation server, so `next/image` serves the
   * committed files directly. That is fine here: the whole image set is
   * hand-tuned WebP totalling ~1.2 MB, and every asset still gets its inline
   * blur placeholder and intrinsic dimensions from `src/lib/media.ts`.
   *
   * Deploying to a Node host (Vercel, a container) instead? Drop `output` and
   * `images.unoptimized` and the optimiser takes over with no other changes.
   */
  output: "export",
  images: {
    unoptimized: true,
    formats: ["image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2400],
  },
};

export default nextConfig;
