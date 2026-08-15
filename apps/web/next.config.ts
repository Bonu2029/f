import type { NextConfig } from 'next';

/**
 * Security headers applied to every response. `Content-Security-Policy` is
 * deliberately strict: no third-party script origins are needed because Stripe
 * Checkout and the Customer Portal are full-page redirects rather than embeds.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(), payment=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@afd/shared'],
  experimental: {
    // Server Actions are used for every dashboard mutation.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
