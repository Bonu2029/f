import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Car, Clock, MapPin, ShieldCheck, Star } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { BookSoonestBar, BusinessAvailability } from "@/components/business/business-availability";
import { DistanceFromYou, ProfileActions } from "@/components/business/profile-actions";
import { Avatar, Cover, Media } from "@/components/ui/media";
import { Badge, Card, Rating, Section, StarRow } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { getAllBusinessSlugs, getBusinessProfile } from "@/lib/data/server";
import { formatCents } from "@/lib/pricing";
import { DAY_NAMES, formatDuration, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return getAllBusinessSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = getBusinessProfile(slug);
  if (!data) return { title: "Business not found" };
  const { business, category } = data;
  const title = `${business.name} — ${category?.name ?? "Services"} in ${business.neighborhood}`;
  const description = `${business.tagline}. Book ${category?.name.toLowerCase() ?? "an appointment"} at ${business.name}, ${business.neighborhood}, Philadelphia. ${business.rating.toFixed(1)}★ from ${business.review_count} reviews. Real availability on NOW.`;
  return {
    title,
    description,
    alternates: { canonical: `/business/${business.slug}` },
    openGraph: { title, description, type: "website", url: `/business/${business.slug}` },
  };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getBusinessProfile(slug);
  if (!data) notFound();

  const { business, services, staff, staffServiceIds, reviews, hours, category, ratingBreakdown } = data;
  const today = new Date().getDay();
  const todayHours = hours.find((h) => h.day === today);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.about,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address_line1,
      addressLocality: "Philadelphia",
      addressRegion: "PA",
      postalCode: business.postal_code,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng },
    telephone: business.phone,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: business.rating,
      reviewCount: business.review_count,
    },
    priceRange: "$".repeat(business.price_level),
  };

  return (
    <CustomerShell header="compact" title={business.name}>
      <script
        type="application/ld+json"
        // Structured data for the public profile page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---- Header ------------------------------------------------------- */}
      <div className="-mx-4 sm:mx-0">
        <Cover
          seed={business.media_seed}
          icon={category?.icon}
          className="h-40 sm:h-56 sm:rounded-2xl"
        />
      </div>

      <div className="relative -mt-8 px-1">
        <span className="inline-block rounded-2xl bg-surface p-1 shadow-card">
          <Avatar seed={`${business.media_seed}-logo`} name={business.name} size={64} className="rounded-xl" />
        </span>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">
            {business.name}
          </h1>
          {business.verification_status === "verified" && (
            <Badge tone="brand" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              Verified
            </Badge>
          )}
        </div>
        <p className="mt-1 text-[14.5px] text-ink-soft">{business.tagline}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-muted">
          <Link href="#reviews" className="hover:text-ink">
            <Rating value={business.rating} count={business.review_count} size="md" />
          </Link>
          <DistanceFromYou lat={business.lat} lng={business.lng} />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {todayHours && !todayHours.is_closed && todayHours.closes_at
              ? `Open until ${formatTime(todayHours.closes_at)}`
              : "Closed today"}
          </span>
          <span aria-label={`Price level ${business.price_level} of 3`}>
            {"$".repeat(business.price_level)}
          </span>
        </div>

        <p className="mt-2 text-[13.5px] text-ink-muted">
          {business.address_line1}, {business.neighborhood}, Philadelphia PA {business.postal_code}
        </p>

        <div className="mt-4">
          <ProfileActions
            businessId={business.id}
            businessName={business.name}
            phone={business.phone}
            address={`${business.address_line1}, Philadelphia PA ${business.postal_code}`}
          />
        </div>
      </div>

      {/* ---- Availability -------------------------------------------------- */}
      <div className="mt-6">
        <BusinessAvailability businessId={business.id} />
      </div>

      {/* ---- About --------------------------------------------------------- */}
      <Section className="mt-8" title="About">
        <Card className="p-4">
          <p className="text-[14.5px] leading-relaxed text-ink-soft">{business.about}</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {business.instant_book && <Badge tone="live">Instant booking</Badge>}
            <Badge tone="neutral">
              Free cancellation up to {business.cancellation_policy.free_cancellation_hours} hrs before
            </Badge>
            {business.website && <Badge tone="neutral">{business.website}</Badge>}
          </div>
        </Card>
      </Section>

      {/* ---- Services ------------------------------------------------------ */}
      <Section className="mt-8" title="Services" subtitle={`${services.length} bookable services`}>
        <div className="grid gap-2.5">
          {services.map((service) => (
            <Card key={service.id} className="p-4">
              <div className="flex gap-3.5">
                <Media
                  seed={service.media_seed}
                  icon={category?.icon}
                  className="hidden h-16 w-16 shrink-0 sm:block"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-ink">{service.name}</h3>
                      <p className="mt-0.5 text-[13px] text-ink-muted">
                        {formatDuration(service.duration_minutes)}
                        {service.deposit_cents
                          ? ` · ${formatCents(service.deposit_cents, { showCents: false })} deposit`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                      {service.price_cents === 0 ? "Free" : formatCents(service.price_cents, { showCents: false })}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                    {service.description}
                  </p>
                  <div className="mt-3">
                    <BusinessAvailability businessId={business.id} serviceId={service.id} compact />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Team ---------------------------------------------------------- */}
      <Section className="mt-8" title="Team" subtitle={`${staff.length} people take bookings here`}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {staff.map((member) => (
            <Card key={member.id} className="flex gap-3.5 p-4">
              <Avatar seed={member.media_seed} name={member.full_name} size={52} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">{member.full_name}</h3>
                <p className="truncate text-[13px] text-ink-muted">{member.role}</p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Rating value={member.rating} count={member.review_count} />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{member.bio}</p>
                <p className="mt-2 text-[12.5px] text-ink-muted">
                  {staffServiceIds[member.id]?.length ?? 0} services
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Reviews ------------------------------------------------------- */}
      <Section
        id="reviews"
        className="mt-8"
        title="Reviews"
        subtitle={`${business.review_count.toLocaleString()} reviews · verified bookings only`}
      >
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[38px] font-bold leading-none tracking-[-0.04em] text-ink">
                {business.rating.toFixed(1)}
              </p>
              <StarRow value={Math.round(business.rating)} className="mt-2" />
              <p className="mt-1 text-[12.5px] text-ink-muted">
                {business.review_count.toLocaleString()} reviews
              </p>
            </div>
            <div className="min-w-[180px] flex-1 space-y-1">
              {([5, 4, 3, 2, 1] as const).map((n) => {
                const count = ratingBreakdown[n];
                const total = reviews.length || 1;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-3 text-[12px] text-ink-muted">{n}</span>
                    <Star className="h-3 w-3 fill-caution-500 text-caution-500" />
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                      <span
                        className="block h-full rounded-full bg-caution-500"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[12px] text-ink-muted">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="mt-3 grid gap-2.5">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar seed={review.customer_id} name={review.author} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[14.5px] font-semibold text-ink">{review.author}</p>
                    <Badge tone="live" icon={<ShieldCheck className="h-3 w-3" />}>
                      Verified booking
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                    <StarRow value={review.rating} />
                    <span>
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {review.serviceName && <span>· {review.serviceName}</span>}
                    {review.staffName && <span>· with {review.staffName}</span>}
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{review.body}</p>

                  {review.photo_seeds.length > 0 && (
                    <div className="mt-2.5 flex gap-2">
                      {review.photo_seeds.map((seed) => (
                        <Media key={seed} seed={seed} icon={category?.icon} className="h-16 w-16" />
                      ))}
                    </div>
                  )}

                  {review.business_reply && (
                    <div className="mt-3 rounded-xl bg-sunken px-3.5 py-3">
                      <p className="text-[12.5px] font-semibold text-ink">
                        Response from {business.name}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                        {review.business_reply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Location & hours ---------------------------------------------- */}
      <Section className="mt-8" title="Location & hours">
        <div className="grid gap-2.5 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div
              className="h-44 w-full"
              style={{
                backgroundColor: "#F4F3EF",
                backgroundImage: `
                  linear-gradient(rgba(22,22,42,0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(22,22,42,0.05) 1px, transparent 1px)
                `,
                backgroundSize: "26px 26px",
              }}
              role="img"
              aria-label={`Map showing ${business.name} in ${business.neighborhood}`}
            >
              <div className="flex h-full items-center justify-center">
                <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-lift">
                  <MapPin className="h-3.5 w-3.5" />
                  {business.neighborhood}
                </span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[14.5px] font-semibold text-ink">{business.address_line1}</p>
              <p className="text-[13.5px] text-ink-muted">
                Philadelphia, PA {business.postal_code}
              </p>
              {business.parking_note && (
                <p className="mt-2.5 flex items-start gap-2 text-[13px] text-ink-soft">
                  <Car className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  {business.parking_note}
                </p>
              )}
              <ButtonLink
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address_line1 + ", Philadelphia PA")}`}
                variant="outline"
                size="sm"
                className="mt-3.5"
              >
                Get directions
              </ButtonLink>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-[15px] font-semibold text-ink">Opening hours</h3>
            <ul className="mt-3 space-y-1.5">
              {hours.map((h) => (
                <li
                  key={h.day}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-1.5 text-[13.5px]",
                    h.day === today ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-soft",
                  )}
                >
                  <span>{DAY_NAMES[h.day]}</span>
                  <span className="tabular-nums">
                    {h.is_closed || !h.opens_at || !h.closes_at
                      ? "Closed"
                      : `${formatTime(h.opens_at)} – ${formatTime(h.closes_at)}`}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-sunken p-3.5">
              <p className="text-[13px] font-semibold text-ink">Cancellation policy</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                Free cancellation up to {business.cancellation_policy.free_cancellation_hours} hours
                before your appointment. After that, {business.cancellation_policy.late_cancellation_fee_pct}%
                of the service price may be charged. No-shows may be charged in full.
              </p>
            </div>
          </Card>
        </div>
      </Section>

      <div className="h-24 sm:h-8" />
      <BookSoonestBar businessId={business.id} />
    </CustomerShell>
  );
}
