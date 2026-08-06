import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Wordmark + abstract mark: a soft house arch, a curved light beam passing
 * through it, and a single small sparkle. No buckets, brooms or bubbles.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('h-9 w-9', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="luma-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7BA894" />
          <stop offset="100%" stopColor="#5F8F7B" />
        </linearGradient>
      </defs>
      <path
        d="M8 19.5 20 8.5l12 11"
        fill="none"
        stroke="url(#luma-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 18.4V29a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V18.4"
        fill="none"
        stroke="url(#luma-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 27c2.6-6.4 7.2-9.6 13.5-9.6"
        fill="none"
        stroke="#AFCDBF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M26.5 6.6c.5 2.2 1.3 3 3.5 3.5-2.2.5-3 1.3-3.5 3.5-.5-2.2-1.3-3-3.5-3.5 2.2-.5 3-1.3 3.5-3.5Z"
        fill="#E8D8C3"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="LumaNest Cleaning — home"
    >
      <LogoMark className="transition-transform duration-500 ease-luma group-hover:scale-105" />
      <span className="leading-none">
        <span className="block font-display text-[22px] tracking-tight text-ink">
          Luma<span className="text-accent">Nest</span>
        </span>
        {!compact ? (
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
            Cleaning
          </span>
        ) : null}
      </span>
    </Link>
  );
}
