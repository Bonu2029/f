"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

const links = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/for-businesses", label: "For Businesses" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur-md">
      <Container>
        <nav
          aria-label="Main"
          className="flex h-16 items-center justify-between gap-6"
        >
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-ink-950"
                    : "text-ink-700 hover:text-ink-950",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:text-ink-950"
            >
              Log In
            </Link>
            <ButtonLink href="/signup" size="sm">
              Get Started
            </ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="-mr-2 grid size-10 place-items-center rounded-xl text-ink-900 md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg viewBox="0 0 24 24" className="size-5" fill="none">
              {open ? (
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </nav>
      </Container>

      {open ? (
        <div
          id="mobile-menu"
          className="border-t border-line bg-white md:hidden"
        >
          <Container className="space-y-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="block rounded-xl px-3 py-3 text-base font-medium text-ink-900 hover:bg-surface-muted"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={close}
              className="block rounded-xl px-3 py-3 text-base font-medium text-ink-900 hover:bg-surface-muted"
            >
              Log In
            </Link>
            <ButtonLink
              href="/signup"
              size="lg"
              fullWidth
              className="mt-3"
              onClick={close}
            >
              Get Started
            </ButtonLink>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
