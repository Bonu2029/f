import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-white p-6 shadow-soft",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-ink-950", className)}>
      {children}
    </h3>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-2 text-[0.9375rem] leading-relaxed text-ink-700", className)}>
      {children}
    </p>
  );
}
