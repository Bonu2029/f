import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 " +
  "whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-white shadow-soft hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "bg-white text-ink-950 border border-line-strong hover:bg-surface-muted",
  ghost: "text-ink-700 hover:bg-surface-muted hover:text-ink-950",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Omit<CommonProps, "children">) {
  return cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "className" | "children" | "href"
  >) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
