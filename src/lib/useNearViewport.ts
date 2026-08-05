"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element is within `rootMargin` of the viewport, and stays true.
 *
 * Used to defer GSAP setup. Every Reveal, SplitLines and Parallax on the page
 * previously built its timeline during hydration — around fifty of them at
 * once, with SplitText rewriting each heading into per-word spans. That landed
 * as a single ~1s block on the main thread before the page could respond.
 *
 * The margin is deliberately generous: setup has to finish well before the
 * element reaches its own trigger point, or the reveal would be created after
 * it should already have played and the element would simply pop in.
 */
export function useNearViewport(
  ref: RefObject<HTMLElement | null>,
  rootMargin = "800px 0px",
) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;

    // No observer support: behave exactly as before and set up immediately.
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, near]);

  return near;
}
