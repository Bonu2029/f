"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";

/**
 * Route-level enter transition. A copper curtain wipes up while the incoming
 * page settles, so navigating between pages doesn't feel like a hard cut.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useSafeReducedMotion();

  /* The element tree stays identical whether or not motion is reduced — only
     the durations change. Branching on `reduced` here would desync the server
     render (which always sees "no preference") from the client's first paint. */
  return (
    <>
      <motion.div
        key={`curtain-${pathname}`}
        aria-hidden
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: reduced ? 0 : 0.85, ease: EASE_EDITORIAL }}
        className="pointer-events-none fixed inset-0 z-[118] origin-top bg-navy-950"
      />
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reduced ? { duration: 0 } : { duration: 0.55, delay: 0.2, ease: EASE_EDITORIAL }
        }
      >
        {children}
      </motion.div>
    </>
  );
}
