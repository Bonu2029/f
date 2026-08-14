import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { MarketingShell } from "@/components/marketing/page-shell";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Media } from "@/components/ui/media";
import { Badge, Card, Rating } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CITIES, cityBySlug } from "@/lib/data/cities";
import { categorySeoSlug } from "@/lib/data/categories";
import { getCityStats } from "@/lib/data/server";
import { getCategoryListings } from "@/lib/data/server";
import { formatCents } from "@/lib/pricing";

export function generateStaticParams() {
  return CITIES.filter((c) => c.is_live).map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = cityBySlug(slug);
  if (!city) return { title: "City not found" };
  const title = `Book local services in ${city.name}, ${city.state_code}`;
  const description = `Haircuts, nails, massage, cleaning, detailing and more in ${city.name} with real availability today. Compare price, distance and rating, then book instantly on NOW.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title, description, url: `/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = cityBySlug(slug);
  if (!city || !city.is_live) notFound();

  const stats = getCityStats();

  return (
    <MarketingShell width="wide">
      <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600">
        <MapPin className="h-3.5 w-3.5" />
        {city.name}, {city.state_code}
      </p>
      <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[44px]">
        Book local services in {city.name}
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        {stats.businessCount} businesses across {stats.categories.length} categories, with real
        appointment availability today. Compare price, distance and rating, then book in a few taps.
      </p>
      <ButtonLink href="/search" className="mt-5" size="lg">
        See what&rsquo;s available now
      </ButtonLink>

      <section className="mt-12">
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink">Browse by service</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.categories.map((category) => (
            <Link
              key={category.id}
              href={`/${city.slug}/${categorySeoSlug(category)}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-200 hover:shadow-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CategoryIcon icon={category.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold text-ink">
                  {category.plural_name} in {city.name}
                </span>
                <span className="block text-[13px] text-ink-muted">
                  {category.count} {category.count === 1 ? "business" : "businesses"}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink">Neighbourhoods</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {city.neighborhoods.map((n) => (
            <Link
              key={n}
              href={`/search?q=${encodeURIComponent(n)}`}
              className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink-soft transition hover:border-brand-200 hover:text-ink"
            >
              {n}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink">
          Highly rated in {city.name}
        </h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.categories.slice(0, 6).flatMap((category) =>
            getCategoryListings(category.slug)
              .slice(0, 1)
              .map(({ business, fromPriceCents }) => (
                <Card key={business.id} className="flex gap-3.5 p-3.5">
                  <Media seed={business.media_seed} icon={category.icon} className="h-16 w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/business/${business.slug}`}
                      className="truncate text-[15px] font-semibold text-ink hover:text-brand-600"
                    >
                      {business.name}
                    </Link>
                    <p className="truncate text-[12.5px] text-ink-muted">
                      {category.name} · {business.neighborhood}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Rating value={business.rating} count={business.review_count} />
                      {fromPriceCents > 0 && (
                        <span className="text-[12.5px] font-semibold text-ink">
                          from {formatCents(fromPriceCents, { showCents: false })}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )),
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink">Other cities</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13.5px] text-ink-soft"
            >
              {c.name}, {c.state_code}
              <Badge tone={c.is_live ? "live" : "neutral"}>{c.is_live ? "Live" : "Planned"}</Badge>
            </span>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
