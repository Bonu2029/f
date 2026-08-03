"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, Phone } from "@/components/ui/Icons";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";
import { navLinks, shop, hoursSummary } from "@/lib/data";

export function Nav() {
  const pathname = usePathname();
  const reduced = useSafeReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  /** Only the home page has a hero to sit transparently over. */
  const overHero = pathname === "/" && !scrolled;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[130]
                   focus:rounded-full focus:bg-navy-900 focus:px-5 focus:py-3 focus:text-xs
                   focus:tracking-[0.16em] focus:text-ivory-100 focus:uppercase"
      >
        Skip to content
      </a>

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: reduced ? 0 : 0.35, ease: EASE_EDITORIAL }}
        className={`fixed inset-x-0 top-0 z-[100] transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          overHero
            ? "bg-transparent"
            : "bg-ivory-100/92 shadow-[0_1px_0_0_rgba(14,26,43,0.08),0_18px_40px_-32px_rgba(14,26,43,0.5)] backdrop-blur-xl"
        }`}
      >
        {/* Slim announcement strip, hidden once scrolling starts */}
        <div
          className={`overflow-hidden border-b border-ivory-100/10 bg-navy-950 transition-[height,opacity] duration-500 ${
            overHero ? "h-9 opacity-100" : "h-0 opacity-0"
          }`}
        >
          <div className="shell flex h-9 items-center justify-between text-[0.625rem] tracking-[0.2em] text-steel-200 uppercase">
            <span className="hidden truncate md:inline">
              {hoursSummary[0]?.days} {hoursSummary[0]?.time} · Walk-ins welcome before noon
            </span>
            <span className="truncate md:hidden">Walk-ins welcome</span>
            <a
              href={shop.phoneHref}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors hover:text-copper-300"
            >
              <Phone className="h-3.5 w-3.5" />
              {shop.phone}
            </a>
          </div>
        </div>

        <nav aria-label="Primary" className="shell flex h-[4.5rem] items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={`${shop.name} — home`}
            className={`shrink-0 transition-colors duration-500 ${
              overHero ? "text-ivory-100" : "text-navy-900"
            }`}
          >
            <Logo markClassName="h-8 w-auto text-copper-400" />
          </Link>

          <ul
            className={`hidden items-center gap-8 text-[0.6875rem] font-medium tracking-[0.18em] uppercase lg:flex ${
              overHero ? "text-ivory-100/85" : "text-navy-800/80"
            } transition-colors duration-500`}
          >
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group relative inline-block py-2 transition-colors hover:text-copper-400"
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-copper-400 transition-[width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <ButtonLink
              href="/#booking"
              size="sm"
              /* max-sm variant, not `hidden` — the button's own inline-flex
                 would otherwise win the display cascade. */
              className="whitespace-nowrap max-sm:hidden"
              icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />}
            >
              Book Now
            </ButtonLink>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className={`relative z-[105] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors duration-500 lg:hidden ${
                open
                  ? "border-ivory-100/30 text-ivory-100"
                  : overHero
                    ? "border-ivory-100/30 text-ivory-100"
                    : "border-navy-900/20 text-navy-900"
              }`}
            >
              <span className="flex w-5 flex-col gap-[5px]">
                <motion.span
                  className="block h-px w-full bg-current"
                  animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
                />
                <motion.span
                  className="block h-px w-full bg-current"
                  animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
                />
              </span>
            </button>
          </div>
        </nav>

        {/* Reading progress */}
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className={`h-px origin-left bg-copper-500 transition-opacity duration-500 ${
            overHero ? "opacity-0" : "opacity-100"
          }`}
        />
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
            className="fixed inset-0 z-[101] flex flex-col bg-navy-950 lg:hidden"
          >
            <div className="grain absolute inset-0 opacity-30" />

            <div className="shell relative flex flex-1 flex-col justify-center pt-24 pb-10">
              <ul className="flex flex-col">
                {navLinks.map((link, i) => (
                  <li key={link.href} className="overflow-hidden border-b border-ivory-100/10">
                    <motion.div
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "110%", transition: { duration: 0.3 } }}
                      transition={{ duration: 0.7, delay: 0.12 + i * 0.055, ease: EASE_EDITORIAL }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="flex items-baseline gap-4 py-4 font-display text-3xl text-ivory-100 transition-colors active:text-copper-400"
                      >
                        <span className="font-sans text-[0.625rem] tracking-[0.2em] text-copper-400">
                          {`0${i + 1}`}
                        </span>
                        {link.label}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-10 flex flex-col gap-5"
              >
                <ButtonLink href="/#booking" size="lg" className="w-full" onClick={() => setOpen(false)}>
                  Book Your Appointment
                </ButtonLink>

                <div className="flex flex-col gap-1 text-[0.8125rem] text-steel-200">
                  <a href={shop.phoneHref} className="transition-colors hover:text-copper-300">
                    {shop.phone}
                  </a>
                  <a href={`mailto:${shop.email}`} className="transition-colors hover:text-copper-300">
                    {shop.email}
                  </a>
                  <span className="mt-2 text-steel-400">
                    {shop.street}, {shop.district} {shop.postcode}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
