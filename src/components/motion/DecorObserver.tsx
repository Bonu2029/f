"use client";

import { useEffect } from "react";

/**
 * Pauses decorative animation that is scrolled out of view.
 *
 * Chrome keeps ticking CSS animations on off-screen elements, and this page
 * carries a lot of them — drifting gradient fields, floating light motes, the
 * service marquee. Individually each is cheap; measured together they held the
 * page at ~22fps even while completely idle, because every frame re-composited
 * decoration nobody could see.
 *
 * Anything marked `data-decor` is observed once here and flagged
 * `data-visible="0"` when it leaves the viewport, which the stylesheet turns
 * into `animation-play-state: paused` for that subtree. Content and scroll-
 * driven animation are untouched, so nothing ScrollTrigger measures is
 * affected.
 */
export default function DecorObserver() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-decor]");
    if (nodes.length === 0) return;

    // Without IntersectionObserver, leave everything running.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).dataset.visible = entry.isIntersecting
            ? "1"
            : "0";
        }
      },
      // A generous margin so nothing visibly starts mid-drift as it enters.
      { rootMargin: "200px 0px", threshold: 0 },
    );

    nodes.forEach((node) => {
      node.dataset.visible = "0";
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
