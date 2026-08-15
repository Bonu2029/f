/**
 * Centralised brand configuration.
 *
 * Everything user-visible about the *product identity* lives here so the
 * application can be rebranded without editing components. Colours are emitted
 * as CSS custom properties by `apps/web/src/app/globals.css`; change the hex
 * values here and in that file's `@theme` block to restyle the product.
 */

export interface BrandContact {
  readonly support: string;
  readonly sales: string;
  readonly legal: string;
  readonly privacy: string;
}

export interface BrandConfig {
  /** Product name shown in nav, emails, page titles, AI disclosure copy. */
  readonly name: string;
  /** Short name for tight spaces (mobile nav, favicons, SMS footers). */
  readonly shortName: string;
  /** One-line positioning statement. */
  readonly tagline: string;
  /** Longer description used for meta tags and Open Graph. */
  readonly description: string;
  /** Legal entity that owns the service. Appears in the legal templates. */
  readonly legalEntity: string;
  /** Marketing site domain, no protocol. */
  readonly domain: string;
  readonly contact: BrandContact;
  /** Emoji or short text used as the fallback favicon/logo mark. */
  readonly logoMark: string;
  /** Path to a logo image inside /public, or null to use the wordmark. */
  readonly logoImage: string | null;
  readonly colors: {
    readonly primary: string;
    readonly primaryForeground: string;
    readonly accent: string;
    readonly background: string;
    readonly surface: string;
    readonly border: string;
    readonly foreground: string;
    readonly muted: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
  };
  readonly social: {
    readonly twitter: string | null;
    readonly linkedin: string | null;
  };
}

export const brand: BrandConfig = {
  name: 'AI Front Desk',
  shortName: 'Front Desk',
  tagline: 'Never miss another customer call.',
  description:
    'Your AI receptionist answers calls, talks naturally with customers, captures leads and books appointments — even when you are busy.',
  legalEntity: 'AI Front Desk',
  domain: 'aifrontdesk.example.com',
  contact: {
    support: 'support@aifrontdesk.example.com',
    sales: 'sales@aifrontdesk.example.com',
    legal: 'legal@aifrontdesk.example.com',
    privacy: 'privacy@aifrontdesk.example.com',
  },
  logoMark: 'AF',
  logoImage: null,
  colors: {
    primary: '#4f46e5',
    primaryForeground: '#ffffff',
    accent: '#7c3aed',
    background: '#fdfdfc',
    surface: '#ffffff',
    border: '#e7e5e4',
    foreground: '#1c1917',
    muted: '#78716c',
    success: '#15803d',
    warning: '#b45309',
    danger: '#b91c1c',
  },
  social: {
    twitter: null,
    linkedin: null,
  },
};

/** Convenience helper for building page titles consistently. */
export function pageTitle(page?: string): string {
  return page ? `${page} · ${brand.name}` : `${brand.name} — ${brand.tagline}`;
}
