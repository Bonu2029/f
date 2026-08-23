import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestForm } from "@/components/tag/request-form";
import { getPublicTag } from "@/lib/data/public-tag";
import { brand } from "@/config/brand";
import type { ServiceRequestKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ kind?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const tag = await getPublicTag(code);

  return {
    title: tag ? `Request service · ${tag.business_name}` : "Request service",
    robots: { index: false, follow: false },
  };
}

export default async function RequestServicePage({
  params,
  searchParams,
}: Props) {
  const [{ code }, { kind: kindParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const tag = await getPublicTag(code);
  if (!tag) notFound();

  const kind: ServiceRequestKind =
    kindParam === "appointment" ? "appointment" : "service";

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto w-full max-w-md px-5 pt-6 pb-12">
        <Link
          href={`/t/${tag.code}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none">
            <path
              d="M12 4.5 6.5 10 12 15.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {tag.business_name}
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-950">
          {kind === "appointment" ? "Book an appointment" : "Request service"}
        </h1>
        {tag.product_name ? (
          <p className="mt-1.5 text-[0.9375rem] text-ink-700">
            For your {tag.product_name.toLowerCase()}.
          </p>
        ) : null}

        <div className="mt-6">
          <RequestForm
            code={tag.code}
            businessName={tag.business_name}
            kind={kind}
          />
        </div>

        <p className="mt-8 text-center text-xs text-ink-400">
          Powered by {brand.name}
        </p>
      </div>
    </div>
  );
}
