"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "urgent" | "danger" | "live";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-[0_1px_2px_rgba(22,22,42,0.12)] hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300",
  secondary:
    "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300",
  outline:
    "border border-line bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/60 active:bg-brand-50",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink active:bg-line-soft",
  urgent:
    "bg-urgent-500 text-white hover:bg-urgent-600 active:bg-urgent-700 shadow-[0_1px_2px_rgba(22,22,42,0.12)]",
  danger: "border border-urgent-100 bg-urgent-50 text-urgent-700 hover:bg-urgent-100",
  live: "bg-live-500 text-white hover:bg-live-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-13 px-6 text-base gap-2 rounded-2xl",
  icon: "h-10 w-10 rounded-full justify-center",
};

const BASE =
  "relative inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60 select-none";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, trailing, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {loading ? (
        <Spinner className={cn("h-4 w-4", variant === "primary" || variant === "urgent" || variant === "live" ? "text-white" : "text-brand-500")} />
      ) : (
        icon
      )}
      {children}
      {trailing}
    </button>
  );
});

export interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  prefetch?: boolean;
  "aria-label"?: string;
  onClick?: () => void;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  trailing,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {icon}
      {children}
      {trailing}
    </Link>
  );
}
