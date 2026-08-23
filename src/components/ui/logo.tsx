import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Wordmark with a small tag glyph. Reads the product name from brand config. */
export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-ink-950 text-white"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none">
          <path
            d="M10.6 2.5H15a2.5 2.5 0 0 1 2.5 2.5v4.4a2 2 0 0 1-.59 1.42l-6.1 6.1a2 2 0 0 1-2.83 0l-4.4-4.4a2 2 0 0 1 0-2.83l6.1-6.1a2 2 0 0 1 1.42-.59Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="13.2" cy="6.8" r="1.35" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[1.0625rem] font-semibold tracking-tight text-ink-950">
          {brand.name}
        </span>
      )}
    </span>
  );

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center rounded-lg", className)}
      aria-label={brand.name}
    >
      {mark}
    </Link>
  );
}
