import Link from "next/link";
import { brand } from "@/config/brand";
import {
  formatDate,
  formatMonthYear,
  isWarrantyActive,
  toDialable,
} from "@/lib/format";
import type { PublicTagView } from "@/lib/supabase/types";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cn } from "@/lib/cn";

/**
 * The page a homeowner sees after tapping a tag.
 *
 * Mobile first: large targets, no navigation, nothing to sign up for. It shows
 * the installing business's branding and the installed item only.
 */
export function TagPage({ tag }: { tag: PublicTagView }) {
  const phone = toDialable(tag.business_phone);
  const warrantyActive = isWarrantyActive(tag.warranty_expires_on);

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto w-full max-w-md px-5 pt-8 pb-12">
        <header className="flex items-center gap-4">
          {tag.business_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tag.business_logo_url}
              alt=""
              className="size-16 shrink-0 rounded-2xl border border-line bg-white object-contain"
            />
          ) : (
            <div className="w-16 shrink-0">
              <ImagePlaceholder
                ratio="1 / 1"
                rounded="rounded-2xl"
                className="bg-white"
              />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink-950">
              {tag.business_name}
            </h1>
            {tag.business_phone ? (
              <p className="mt-0.5 text-[0.9375rem] text-ink-700">
                {tag.business_phone}
              </p>
            ) : null}
          </div>
        </header>

        {tag.product_name ? (
          <div className="mt-6 rounded-2xl border border-line bg-white px-5 py-4">
            <p className="text-lg font-semibold text-ink-950">
              {tag.product_name}
            </p>
            {tag.installed_on ? (
              <p className="mt-0.5 text-sm text-ink-500">
                Installed: {formatMonthYear(tag.installed_on)}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <ActionLink href={`/t/${tag.code}/request`} primary>
            Request Service
          </ActionLink>

          <ActionLink
            href={tag.booking_url ?? `/t/${tag.code}/request?kind=appointment`}
            external={Boolean(tag.booking_url)}
          >
            Book Appointment
          </ActionLink>

          {phone ? (
            <>
              <ActionLink href={`tel:${phone}`} external>
                Call Us
              </ActionLink>
              <ActionLink href={`sms:${phone}`} external>
                Text Us
              </ActionLink>
            </>
          ) : null}
        </div>

        {tag.warranty_expires_on ? (
          <section className="mt-8 rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Warranty Information
            </h2>
            <p className="mt-2 text-[0.9375rem] text-ink-950">
              {warrantyActive ? "Covered until" : "Coverage ended"}{" "}
              {formatDate(tag.warranty_expires_on)}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Contact {tag.business_name} with any questions about your coverage.
            </p>
          </section>
        ) : null}

        {tag.product_details || tag.business_about ? (
          <section className="mt-4 rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              {tag.product_details
                ? "Installed Product Information"
                : "About This Business"}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-900">
              {tag.product_details ?? tag.business_about}
            </p>
            {tag.product_details && tag.business_about ? (
              <p className="mt-3 border-t border-line pt-3 text-sm text-ink-700">
                {tag.business_about}
              </p>
            ) : null}
          </section>
        ) : null}

        {tag.business_website ? (
          <a
            href={tag.business_website}
            className="mt-6 block text-center text-sm text-ink-700 underline underline-offset-4"
            rel="noopener noreferrer"
          >
            Visit {tag.business_name}
          </a>
        ) : null}

        <p className="mt-10 text-center text-xs text-ink-400">
          Powered by {brand.name}
        </p>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  children,
  primary,
  external,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  external?: boolean;
}) {
  const className = cn(
    "flex h-14 w-full items-center justify-center rounded-2xl text-[1.0625rem] font-medium transition-colors",
    primary
      ? "bg-accent-500 text-white hover:bg-accent-600"
      : "border border-line-strong bg-white text-ink-950 hover:bg-surface-muted",
  );

  if (external) {
    return (
      <a href={href} className={className} rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
