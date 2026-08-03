"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/ui/Logo";
import { EASE_EDITORIAL } from "@/components/ui/motion";

const SESSION_KEY = "ashgrove:intro-played";

/**
 * Barber-pole loading curtain. Plays once per session, and collapses
 * immediately for visitors who prefer reduced motion.
 */
export function Preloader() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // sessionStorage throws in embedded or hardened contexts — never let the
    // intro animation take the page down with it.
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      return;
    }

    if (reduced) return;

    setVisible(true);
    document.documentElement.style.overflow = "hidden";

    let value = 0;
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 6 + Math.random() * 12);
      setProgress(Math.round(value));
      if (value >= 100) window.clearInterval(timer);
    }, 90);

    const done = window.setTimeout(() => setVisible(false), 1750);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(done);
      document.documentElement.style.overflow = "";
    };
  }, [reduced]);

  useEffect(() => {
    if (!visible) document.documentElement.style.overflow = "";
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-navy-950"
          exit={{ y: "-100%" }}
          transition={{ duration: 1, ease: EASE_EDITORIAL }}
          aria-hidden
        >
          <div className="grain absolute inset-0 opacity-40" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
            className="relative flex flex-col items-center"
          >
            <LogoMark className="h-16 w-auto text-copper-400" />

            {/* Barber pole */}
            <div className="relative mt-8 h-20 w-[3px] overflow-hidden rounded-full bg-navy-800">
              <div
                className="absolute inset-x-0 -top-20 h-40 animate-[pole-spin_1.1s_linear_infinite]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--color-ivory-100) 0 6px, var(--color-burgundy-500) 6px 12px, var(--color-steel-600) 12px 18px)",
                }}
              />
            </div>

            <div className="mt-8 flex items-baseline gap-3 font-sans text-[0.625rem] tracking-[0.34em] text-steel-400 uppercase">
              <span>Ashgrove</span>
              <span className="tabular-nums text-copper-400">{progress}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
