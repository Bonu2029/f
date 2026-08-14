import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { MarketingShell } from "@/components/marketing/page-shell";
import { Media } from "@/components/ui/media";
import { Badge, Card, Rating } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CategoryLiveAvailability } from "@/components/marketing/category-availability";
import { CITIES, cityBySlug } from "@/lib/data/cities";
import { CATEGORIES, categoryBySeoSlug, categorySeoSlug } from "@/lib/data/categories";
import { getCategoryListings } from "@/lib/data/server";
import { formatCents } from "@/lib/pricing";

export function generateStaticParams() {
  return CITIES.filter((c) => c.is_live).flatMap((city) =>
    CATEGORIES.map((category) => ({ city: city.slug, category: categorySeoSlug(category) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const city = cityBySlug(citySlug);
  const category = categoryBySeoSlug(categorySlug);
  if (!city || !category) return { title: "Not found" };

  const listings = getCategoryListings(category.slug);
  const title = `${category.plural_name} in ${city.name}, ${city.state_code}`;
  const description = `Book ${category.plural_name.toLowerCase()} in ${city.name} with real availability today. ${listings.length} businesses, transparent prices, verified reviews, instant booking on NOW.`;

  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${categorySlug}` },
    openGraph: { title, description, url: `/${city.slug}/${categorySlug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}) {
  const { city: citySlug, category: categorySlug } = await params;
  const city = cityBySlug(citySlug);
  const category = categoryBySeoSlug(categorySlug);
  if (!city || !city.is_live || !category) notFound();

  const listings = getCategoryListings(category.slug);
  const cheapest = listings.filter((l) => l.fromPriceCents > 0);
  const fromPrice = cheapest.length ? Math.min(...cheapest.map((l) => l.fromPriceCents)) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.plural_name} in ${city.name}`,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.business.name,
      url: `/business/${l.business.slug}`,
    })),
  };

  return (
    <MarketingShell width="wide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-muted">
        <Link href={`/${city.slug}`} className="hover:text-ink">
          {city.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{category.plural_name}</span>
      </nav>

      <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[42px]">
        {category.plural_name} in {city.name}
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        {listings.length} {listings.length === 1 ? "business" : "businesses"} offering{" "}
        {category.name.toLowerCase()} appointments in {city.name}
        {fromPrice > 0 && <>, from {formatCents(fromPrice, { showCents: false })}</>}. Prices, distance
        and real availability are shown before you book.
      </p>

      <ButtonLink href={`/search?category=${category.slug}`} className="mt-5" size="lg">
        See live availability
      </ButtonLink>

      {/* Live availability is client-rendered on top of the static listing. */}
      <div className="mt-8">
        <CategoryLiveAvailability categorySlug={category.slug} />
      </div>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">
          All {category.plural_name.toLowerCase()} in {city.name}
        </h2>
        <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
          {listings.map(({ business, fromPriceCents, serviceCount }) => (
            <Card key={business.id} className="flex gap-3.5 p-4">
              <Media seed={business.media_seed} icon={category.icon} className="h-[76px] w-[76px] shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-1.5">
                  <Link
                    href={`/business/${business.slug}`}
                    className="truncate text-[16px] font-semibold text-ink hover:text-brand-600"
                  >
                    {business.name}
                  </Link>
                  {business.verification_status === "verified" && (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-brand-500" aria-label="Verified" />
                  )}
                </h3>
                <p className="mt-0.5 truncate text-[13px] text-ink-muted">{business.tagline}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <Rating value={business.rating} count={business.review_count} />
                  <span className="inline-flex items-center gap-1 text-ink-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {business.neighborhood}
                  </span>
                  {fromPriceCents > 0 && (
                    <span className="font-semibold text-ink">
                      from {formatCents(fromPriceCents, { showCents: false })}
                    </span>
                  )}
                  <span className="text-ink-muted">{serviceCount} services</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
        {listings.length === 0 && (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[14px] text-ink-muted">
            No {category.plural_name.toLowerCase()} listed in {city.name} yet.{" "}
            <Link href="/for-business" className="font-medium text-brand-600 underline">
              List your business
            </Link>
            .
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink">Other services in {city.name}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <Link
              key={c.id}
              href={`/${city.slug}/${categorySeoSlug(c)}`}
              className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink-soft transition hover:border-brand-200 hover:text-ink"
            >
              {c.plural_name}
            </Link>
          ))}
        </div>
        <div className="mt-5">
          <Badge tone="neutral">
            Prototype data — all businesses shown here are fictional
          </Badge>
        </div>
      </section>
    </MarketingShell>
  );
}
