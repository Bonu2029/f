"use client";

import {
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type MouseEvent,
} from "react";
import { gsap, registerGsap, prefersReducedMotion } from "@/lib/gsap";

type Variant = "solid" | "outline" | "ghost" | "glass";
type Size = "md" | "lg";

const BASE =
  "group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden " +
  "rounded-full font-sans font-medium tracking-[0.02em] cursor-pointer select-none " +
  "transition-[color,background-color,border-color,box-shadow] duration-300 " +
  "disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTS: Record<Variant, string> = {
  solid:
    "bg-graphite text-cream shadow-[0_10px_30px_-12px_rgba(33,30,27,0.55)] hover:shadow-[0_18px_44px_-14px_rgba(33,30,27,0.6)]",
  outline:
    "border border-copper/40 text-graphite hover:border-copper hover:text-copper bg-transparent",
  ghost: "text-graphite hover:text-copper",
  glass:
    "glass text-graphite hover:border-copper/40 hover:shadow-[0_20px_60px_-20px_rgba(154,90,50,0.35)]",
};

const SIZES: Record<Size, string> = {
  md: "min-h-[46px] px-6 text-[0.8125rem]",
  lg: "min-h-[56px] px-9 text-[0.875rem]",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  /** Magnetic pull strength in px. 0 disables it. */
  magnetic?: number;
  icon?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Magnetic button. The label and the shell move at different rates, which is
 * the detail that makes the pull read as physical rather than as a transform.
 */
export default function Button({
  children,
  variant = "solid",
  size = "md",
  href,
  className = "",
  magnetic = 14,
  icon,
  ...rest
}: Props) {
  const shell = useRef<HTMLElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  const onMove = (event: MouseEvent) => {
    registerGsap();
    const el = shell.current;
    if (!el || !magnetic || prefersReducedMotion()) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const pull = magnetic / Math.max(rect.width, rect.height);

    gsap.to(el, { x: x * pull, y: y * pull, duration: 0.55, ease: "silk" });
    gsap.to(label.current, {
      x: x * pull * 0.5,
      y: y * pull * 0.5,
      duration: 0.55,
      ease: "silk",
    });
  };

  const onLeave = () => {
    const el = shell.current;
    if (!el) return;
    gsap.to([el, label.current], {
      x: 0,
      y: 0,
      duration: 0.9,
      ease: "elastic.out(1, 0.5)",
    });
  };

  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  const inner = (
    <>
      {/* Light sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgba(255,252,247,0.42),transparent)] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-full"
      />
      <span ref={label} className="relative z-10 inline-flex items-center gap-2.5">
        {children}
        {icon}
      </span>
    </>
  );

  if (href) {
    const { onClick, "aria-label": ariaLabel } = rest;
    return (
      <a
        ref={shell as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={classes}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick as unknown as (e: MouseEvent<HTMLAnchorElement>) => void}
        aria-label={ariaLabel}
        data-cursor="link"
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      ref={shell as React.RefObject<HTMLButtonElement>}
      className={classes}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="link"
      {...rest}
    >
      {inner}
    </button>
  );
}
