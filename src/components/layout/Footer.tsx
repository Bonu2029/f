"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/components/ui/motion";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, socialIcon } from "@/components/ui/Icons";
import { addressLines, hours, navLinks, shop, socials } from "@/lib/data";

export function Footer() {
  const reduced = useSafeReducedMotion();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-ivory-100">
      {/* Copper line travelling above the footer */}
      <div aria-hidden className="relative h-px w-full overflow-hidden bg-ivory-100/10">
        <motion.div
          className="absolute inset-y-0 w-1/3 rule-copper"
          animate={reduced ? {} : { x: ["-120%", "320%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="grain absolute inset-0 opacity-30" />

      <div className="shell relative py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          {/* Brand */}
          <div>
            <Logo markClassName="h-10 w-auto text-copper-400" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-steel-200">
              A {shop.district} barbershop built on quiet craft — precision cutting,
              sharp beard work and an unhurried chair.
            </p>

            <div className="mt-7 flex gap-3">
              {socials.map((social) => {
                const Icon = socialIcon[social.label as keyof typeof socialIcon];
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${shop.name} on ${social.label}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory-100/15
                               text-ivory-100/70 transition-all duration-300 hover:-translate-y-0.5
                               hover:border-copper-400/60 hover:text-copper-300"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer">
            <h2 className="font-sans text-[0.625rem] tracking-[0.24em] text-copper-300 uppercase">
              Explore
            </h2>
            <ul className="mt-5 flex flex-col gap-3 text-sm text-steel-200">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-copper-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/reviews" className="transition-colors hover:text-copper-300">
                  All reviews
                </Link>
              </li>
            </ul>
          </nav>

          {/* Hours */}
          <div>
            <h2 className="font-sans text-[0.625rem] tracking-[0.24em] text-copper-300 uppercase">
              Hours
            </h2>
            <dl className="mt-5 flex flex-col gap-2.5 text-sm">
              {hours
                .slice()
                .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
                .map((entry) => (
                  <div key={entry.day} className="flex items-baseline justify-between gap-4">
                    <dt className="text-steel-400">{entry.short}</dt>
                    <dd
                      className={
                        entry.open ? "tabular-nums text-steel-200" : "text-steel-400/70 italic"
                      }
                    >
                      {entry.open ? `${entry.open} – ${entry.close}` : "Closed"}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          {/* Contact + CTA */}
          <div>
            <h2 className="font-sans text-[0.625rem] tracking-[0.24em] text-copper-300 uppercase">
              Find us
            </h2>
            <address className="mt-5 flex flex-col gap-1 text-sm text-steel-200 not-italic">
              {addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <div className="mt-4 flex flex-col gap-1.5 text-sm">
              <a href={shop.phoneHref} className="text-steel-200 transition-colors hover:text-copper-300">
                {shop.phone}
              </a>
              <a
                href={`mailto:${shop.email}`}
                className="text-steel-200 transition-colors hover:text-copper-300"
              >
                {shop.email}
              </a>
            </div>

            <ButtonLink
              href="/#booking"
              size="sm"
              className="mt-6"
              icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />}
            >
              Book a chair
            </ButtonLink>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-ivory-100/10 pt-7 text-[0.75rem] text-steel-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {shop.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-copper-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-copper-300">
              Terms
            </Link>
            <span className="hidden sm:inline">
              {shop.district}, {shop.city}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
