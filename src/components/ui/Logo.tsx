import { shop } from "@/lib/data";

type Props = {
  className?: string;
  /** Drawn stroke colour; defaults to the surrounding text colour. */
  markColor?: string;
};

/** Arched monogram mark — an A framed by a barber-pole ribbon. */
export function LogoMark({ className, markColor = "currentColor" }: Props) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M4 24a20 20 0 0 1 40 0v28H4V24Z"
        stroke={markColor}
        strokeWidth="1.5"
        opacity="0.55"
      />
      <path d="M24 14 12.5 43h4.2l2.6-7h9.4l2.6 7h4.2L24 14Zm0 8.6 3.3 9h-6.6l3.3-9Z" fill={markColor} />
      <path d="M11 47.5h26" stroke={markColor} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Full lockup: mark, wordmark and the est. line. */
export function Logo({
  className = "",
  markClassName = "h-9 w-auto",
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.0625rem] font-semibold tracking-[0.16em] uppercase">
          Ashgrove
        </span>
        {!compact && (
          <span className="mt-1 text-[0.5625rem] font-medium tracking-[0.32em] uppercase opacity-70">
            Barber Co · Est {shop.founded}
          </span>
        )}
      </span>
    </span>
  );
}
