import type { Metadata } from 'next';
import { site } from './site';

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

/**
 * Every route calls this so titles, descriptions, canonicals and Open Graph
 * data stay consistent without repeating boilerplate per page.
 */
export function pageMeta({
  title,
  description,
  path,
  keywords,
}: PageMetaInput): Metadata {
  const url = `${site.url}${path}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · ${site.shortName}`,
      description,
      url,
      siteName: site.name,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${site.shortName}`,
      description,
    },
  };
}

/**
 * LocalBusiness data is intentionally conservative: no ratings, no awards and
 * no address are asserted, because none of that has been verified yet.
 */
export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: site.name,
    slogan: site.tagline,
    description: site.description,
    url: site.url,
    email: site.email,
    telephone: site.phone,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Service areas listed on the LumaNest locations page',
    },
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: input.name,
    name: input.name,
    description: input.description,
    url: `${site.url}${input.path}`,
    provider: {
      '@type': 'HomeAndConstructionBusiness',
      name: site.name,
      url: site.url,
    },
  };
}

/** Only ever called with questions that are visibly rendered on the page. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
