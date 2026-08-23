import Link from "next/link";
import { brand } from "@/config/brand";

export default function TagNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted px-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
        <h1 className="text-xl font-semibold text-ink-950">
          This tag isn&rsquo;t active
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-700">
          The business that installed your equipment hasn&rsquo;t set this tag
          up yet, or it has been turned off.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-950 hover:bg-surface-muted"
        >
          About {brand.name}
        </Link>
      </div>
    </div>
  );
}
