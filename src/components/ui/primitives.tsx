import type { HTMLAttributes, ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  interactive,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-card",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line hover:shadow-lift",
        className,
      )}
      {...rest}
    />
  );
}

export function Section({
  title,
  subtitle,
  action,
  className,
  children,
  id,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("space-y-3.5", className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4 px-1">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink sm:text-xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-[13.5px] text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Badges & chips                                                              */
/* -------------------------------------------------------------------------- */

type Tone = "neutral" | "brand" | "live" | "urgent" | "caution" | "outline" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-soft",
  brand: "bg-brand-50 text-brand-700",
  live: "bg-live-50 text-live-700",
  urgent: "bg-urgent-50 text-urgent-700",
  caution: "bg-caution-50 text-caution-700",
  outline: "border border-line text-ink-soft bg-surface",
  dark: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  icon,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.01em] whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Green pulsing dot — reserved for genuinely live availability. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-live-500 opacity-70 animate-[pulse-live_2s_ease-in-out_infinite]" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-live-500" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Rating                                                                      */
/* -------------------------------------------------------------------------- */

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <Star
        className={cn("shrink-0 fill-caution-500 text-caution-500", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden="true"
      />
      <span className={cn("font-semibold text-ink", size === "sm" ? "text-[13px]" : "text-[15px]")}>
        {value.toFixed(1)}
      </span>
      {count != null && (
        <span className={cn("text-ink-muted", size === "sm" ? "text-[12.5px]" : "text-sm")}>
          ({count.toLocaleString()})
        </span>
      )}
    </span>
  );
}

export function StarRow({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= value ? "fill-caution-500 text-caution-500" : "fill-line text-line",
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
      <div className="flex gap-3.5">
        <Skeleton className="h-[86px] w-[86px] shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3.5 flex gap-2">
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty states — every list has one                                           */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line-soft", className)} />;
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "brand" | "live" | "urgent";
  icon?: ReactNode;
}) {
  const accents = {
    neutral: "text-ink",
    brand: "text-brand-600",
    live: "text-live-700",
    urgent: "text-urgent-600",
  } as const;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-[26px] font-semibold tracking-[-0.03em]", accents[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[12.5px] text-ink-muted">{hint}</p>}
    </div>
  );
}
