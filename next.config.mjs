/**
 * Every route in this site is statically prerendered — there are no API routes,
 * server actions or middleware — so it can ship either way:
 *
 *   npm run build          full Next.js output, for a Git-connected Netlify
 *                          deploy. Keeps on-demand AVIF/WebP image optimization.
 *
 *   npm run build:static   plain HTML/CSS/JS in out/, for drag-and-drop hosting.
 *                          next/image must run unoptimized there, so the JPEGs
 *                          in public/images are served as-is.
 */
const staticExport = process.env.STATIC_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: staticExport
    ? { unoptimized: true }
    : {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [],
      },
  ...(staticExport ? { output: 'export' } : {}),
};

export default nextConfig;
