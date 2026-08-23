import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  } as const;

  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8", widths[size], className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
  muted,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  muted?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-20 sm:py-28",
        muted && "bg-surface-muted",
        className,
      )}
    >
      {children}
    </section>
  );
}
