"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Phone } from "@/components/ui/Icons";
import { EASE_EDITORIAL } from "@/components/ui/motion";
import { shop } from "@/lib/data";

/**
 * Mobile-only booking dock. Appears once the hero is behind you and steps
 * aside while the booking section itself is on screen.
 */
export function StickyBookBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.75;
      const booking = document.getElementById("booking");
      const inBooking = booking
        ? (() => {
            const r = booking.getBoundingClientRect();
            return r.top < window.innerHeight * 0.85 && r.bottom > 0;
          })()
        : false;
      setVisible(past && !inBooking);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-book"
          initial={{ y: "130%" }}
          animate={{ y: "0%" }}
          exit={{ y: "130%" }}
          transition={{ duration: 0.55, ease: EASE_EDITORIAL }}
          className="fixed inset-x-0 bottom-0 z-[95] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div
            className="flex items-center gap-2 rounded-full border border-ivory-100/10 bg-navy-900/95
                       p-1.5 shadow-[0_20px_50px_-18px_rgba(8,17,29,0.85)] backdrop-blur-xl"
          >
            <a
              href={shop.phoneHref}
              aria-label={`Call ${shop.name}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                         border border-ivory-100/15 text-ivory-100 transition-colors active:bg-ivory-100/10"
            >
              <Phone className="h-4.5 w-4.5" />
            </a>

            <a
              href="/#booking"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-copper-500
                         text-[0.6875rem] font-medium tracking-[0.18em] text-ivory-50 uppercase
                         transition-colors active:bg-copper-600"
            >
              Book Your Appointment
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
