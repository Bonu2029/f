'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Hydration-safe reduced-motion preference.
 *
 * Framer's `useReducedMotion` reads a media query, so it is `false` while the
 * page is rendered on the server and the real value on the very first client
 * render. Several components branch on it structurally — the page transition
 * wrapper, the hero's particle layer, the timeline's progress line — so that
 * difference made React discard the server HTML and re-render the whole tree,
 * but only for visitors who prefer reduced motion.
 *
 * Returning `false` until after mount makes the first client render match the
 * server, then flips to the real preference. Nothing animates in the gap:
 * globals.css zeroes animation and transition durations under
 * `prefers-reduced-motion: reduce` regardless of what JavaScript does.
 */
export function useReducedMotion() {
  const preference = useFramerReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? Boolean(preference) : false;
}
