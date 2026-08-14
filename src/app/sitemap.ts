import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/data/cities";
import { CATEGORIES, categorySeoSlug } from "@/lib/data/categories";
import { getAllBusinessSlugs } from "@/lib/data/server";

const BASE = "https://booknow.demo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const liveCities = CITIES.filter((c) => c.is_live);

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/deals`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/for-business`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/integrations`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    ...["terms", "privacy", "business-terms", "cancellation-policy", "guidelines"].map((slug) => ({
      url: `${BASE}/legal/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...liveCities.map((city) => ({
      url: `${BASE}/${city.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...liveCities.flatMap((city) =>
      CATEGORIES.map((category) => ({
        url: `${BASE}/${city.slug}/${categorySeoSlug(category)}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.75,
      })),
    ),
    ...getAllBusinessSlugs().map((slug) => ({
      url: `${BASE}/business/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
