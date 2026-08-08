import type { MetadataRoute } from 'next';
import { services } from '@/lib/content/services';
import { site } from '@/lib/site';

const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/build-your-clean', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/instant-estimate', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/clean-match', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/booking', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/how-it-works', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/before-after', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/home-profile', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/trust-safety', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/membership', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/locations', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/customer-dashboard', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...staticRoutes.map((route) => ({
      url: `${site.url}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...services.map((service) => ({
      url: `${site.url}/services/${service.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
