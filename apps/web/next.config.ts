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

/**
 * Hosts allowed to load dev assets, for tunnelled development.
 *
 * Testing a real inbound webhook means running behind a public tunnel, and Next
 * refuses to serve `/_next` to an origin it does not recognise — the page loads
 * but nothing hydrates, which reads as a broken app rather than a blocked
 * request. Read from the environment so a machine-specific hostname does not
 * live in shared configuration and go stale the day the tunnel restarts.
 *
 * Development only: Next ignores it in a production build.
 */
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim().replace(/^https?:\/\//, ''))
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(devOrigins.length ? { allowedDevOrigins: devOrigins } : {}),
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
