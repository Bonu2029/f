"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { navLinks, site, telHref, hasRealPhone } from "@/lib/site";
import { gsap, registerGsap, prefersReducedMotion } from "@/lib/gsap";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const panel = useRef<HTMLDivElement>(null);

  /* Condense the bar once the hero is behind us. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 90);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Highlight the section currently in view. */
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* Mobile panel: staggered entrance, scroll lock, escape to close. */
  useEffect(() => {
    registerGsap();
    const el = panel.current;
    if (!el) return;

    if (open) {
      window.dispatchEvent(new Event("massiel:lock-scroll"));
      document.body.style.overflow = "hidden";
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          el,
          { clipPath: "circle(0% at calc(100% - 3.25rem) 3.25rem)" },
          { clipPath: "circle(150% at calc(100% - 3.25rem) 3.25rem)", duration: 0.85, ease: "drape" },
        );
        gsap.fromTo(
          el.querySelectorAll("[data-menu-item]"),
          { opacity: 0, y: 34 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, delay: 0.22, ease: "silk" },
        );
      }
    } else {
      window.dispatchEvent(new Event("massiel:unlock-scroll"));
      document.body.style.overflow = "";
    }

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[900] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled ? "py-2.5" : "py-5 md:py-7"
        }`}
      >
        <div className="shell">
          <div
            className={`flex items-center justify-between rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              scrolled
                ? "glass px-4 py-2.5 md:px-6 md:py-3"
                : "border border-transparent px-1 py-1"
            }`}
          >
            <a
              href="#top"
              className="shrink-0 py-1 pl-1 pr-3"
              aria-label={`${site.name} — back to top`}
            >
              <Logo size={scrolled ? "sm" : "md"} showDescriptor={!scrolled} />
            </a>

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = active === link.href;
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        aria-current={isActive ? "true" : undefined}
                        className="group relative block px-4 py-2 text-[0.8125rem] tracking-[0.06em] text-graphite-soft transition-colors duration-300 hover:text-graphite"
                      >
                        {link.label}
                        <span
                          className={`absolute inset-x-4 bottom-1 h-px origin-left bg-copper transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                          }`}
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              {hasRealPhone && (
                <a
                  href={telHref}
                  className="hidden rounded-full px-4 py-2 text-[0.8125rem] text-graphite-soft transition-colors duration-300 hover:text-copper xl:block"
                >
                  {site.phone}
                </a>
              )}

              {/* Wrapped rather than given `hidden` directly — that would
                  collide with the button's own `inline-flex`. */}
              <span className="hidden sm:block">
                <Button href="#booking" size="md">
                  Book Appointment
                </Button>
              </span>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? "Close menu" : "Open menu"}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-taupe/60 bg-ivory/60 backdrop-blur transition-colors duration-300 hover:border-copper/50 lg:hidden"
              >
                <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
                <span
                  aria-hidden
                  className={`absolute h-px w-4 bg-graphite transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "rotate-45" : "-translate-y-[3.5px]"
                  }`}
                />
                <span
                  aria-hidden
                  className={`absolute h-px w-4 bg-graphite transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "-rotate-45" : "translate-y-[3.5px]"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu — a full editorial page, not a dropdown list */}
      <div
        id="mobile-menu"
        ref={panel}
        hidden={!open}
        className="fixed inset-0 z-[899] bg-cream lg:hidden"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 50% at 80% 8%, rgba(239,224,203,0.9), transparent 65%), radial-gradient(60% 45% at 10% 92%, rgba(210,204,221,0.7), transparent 68%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between px-6 pb-10 pt-28">
          <nav aria-label="Mobile">
            <ul>
              {navLinks.map((link, i) => (
                <li key={link.href} data-menu-item className="border-b border-taupe/40">
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline gap-4 py-5"
                  >
                    <span className="font-sans text-[0.625rem] tracking-[0.3em] text-copper">
                      0{i + 1}
                    </span>
                    <span className="font-display text-[2rem] leading-none text-graphite">
                      {link.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div data-menu-item className="space-y-5">
            <Button href="#booking" size="lg" className="w-full" onClick={() => setOpen(false)}>
              Book Appointment
            </Button>
            {hasRealPhone && (
              <a
                href={telHref}
                className="block text-center text-sm tracking-[0.08em] text-graphite-soft"
              >
                {site.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
