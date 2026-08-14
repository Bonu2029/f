import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/data/categories";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 text-center">
      <Logo size={30} />
      <span className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <MapPinOff className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-[26px] font-bold tracking-[-0.03em] text-ink">
        We couldn&rsquo;t find that page
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
        The link may be out of date, or the business may no longer be listed. Here&rsquo;s what&rsquo;s
        available near you instead.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/">Back to NOW</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          Search availability
        </ButtonLink>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.slice(0, 6).map((c) => (
          <Link
            key={c.id}
            href={`/search?category=${c.slug}`}
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-soft transition hover:border-brand-200 hover:text-ink"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
