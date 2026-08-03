"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useMagnetic } from "@/components/ui/motion";

type Variant = "primary" | "outline" | "ghost" | "ivory";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-copper-500 text-ivory-50 hover:bg-copper-600 shadow-[0_10px_30px_-14px_rgba(148,84,40,0.85)]",
  ivory: "bg-ivory-100 text-navy-900 hover:bg-ivory-50",
  outline:
    "border border-current/35 text-current hover:border-current/70 hover:bg-current/[0.07]",
  ghost: "text-current hover:text-copper-500",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-5 text-[0.6875rem] tracking-[0.16em]",
  md: "h-12 px-7 text-xs tracking-[0.16em]",
  lg: "h-14 px-9 text-xs tracking-[0.18em]",
};

const shell =
  "group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium uppercase " +
  "transition-[background-color,border-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "cursor-pointer select-none disabled:pointer-events-none disabled:opacity-45";

/** Sheen that sweeps across on hover — the same on links and buttons. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/25 opacity-0
                 transition-none group-hover:animate-[shimmer_0.9s_ease-out] group-hover:opacity-100"
    />
  );
}

type Common = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  magnetic?: boolean;
  icon?: ReactNode;
};

export function ButtonLink({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  magnetic = true,
  icon,
  ...rest
}: Common & { href: string } & Omit<ComponentPropsWithoutRef<"a">, "href" | "children">) {
  const ref = useMagnetic<HTMLAnchorElement>(magnetic ? 0.22 : 0);
  const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
  const classes = `${shell} ${variants[variant]} ${sizes[size]} ${className}`;

  if (external) {
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        {...rest}
      >
        <Sheen />
        <span className="relative z-10">{children}</span>
        {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      </a>
    );
  }

  return (
    <Link ref={ref} href={href} className={classes} {...rest}>
      <Sheen />
      <span className="relative z-10">{children}</span>
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  magnetic = false,
  icon,
  type = "button",
  ...rest
}: Common & ComponentPropsWithoutRef<"button">) {
  const ref = useMagnetic<HTMLButtonElement>(magnetic ? 0.22 : 0);
  return (
    <button
      ref={ref}
      type={type}
      className={`${shell} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      <Sheen />
      <span className="relative z-10">{children}</span>
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
    </button>
  );
}
