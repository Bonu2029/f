"use client";

import { useEffect, useState } from "react";
import OpenStatus from "@/components/ui/OpenStatus";
import { site, telHref, hasRealPhone } from "@/lib/site";

/**
 * Floating mobile booking bar. Appears once the hero is behind you and hides
 * again over the booking section itself — a persistent CTA that never sits on
 * top of the form it is pointing at.
 */
export default function MobileBookBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const booking = document.getElementById("booking");

    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.85;
      let overBooking = false;
      if (booking) {
        const rect = booking.getBoundingClientRect();
        overBooking = rect.top < window.innerHeight * 0.75 && rect.bottom > 0;
      }
      setVisible(pastHero && !overBooking);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[880] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="glass-deep flex items-center gap-3 rounded-full p-2 pl-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.6875rem] tracking-[0.2em] text-copper">
            {site.name.toUpperCase()}
          </p>
          <div className="mt-0.5 truncate text-graphite-soft">
            <OpenStatus compact />
          </div>
        </div>

        {hasRealPhone && (
          <a
            href={telHref}
            aria-label={`Call ${site.name}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-taupe text-graphite"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z" />
            </svg>
          </a>
        )}

        <a
          href="#booking"
          className="flex min-h-[48px] shrink-0 items-center rounded-full bg-graphite px-6 text-[0.8125rem] font-medium text-cream"
        >
          Book
        </a>
      </div>
    </div>
  );
}
