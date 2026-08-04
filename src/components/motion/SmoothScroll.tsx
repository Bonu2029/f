"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, registerGsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Lenis drives the page, GSAP's ScrollTrigger reads from it. Wiring them
 * through the same rAF loop is what stops pinned sections drifting a frame
 * behind the content.
 */
export default function SmoothScroll() {
  useEffect(() => {
    registerGsap();

    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6,
      // Native momentum on touch feels better than a simulated one.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // In-page anchors should glide, not jump.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -12, duration: 1.4 });
      history.replaceState(null, "", id);
    };

    document.addEventListener("click", onAnchorClick);

    // The preloader locks scrolling until the entrance finishes.
    const onLock = () => lenis.stop();
    const onUnlock = () => lenis.start();
    window.addEventListener("massiel:lock-scroll", onLock);
    window.addEventListener("massiel:unlock-scroll", onUnlock);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("massiel:lock-scroll", onLock);
      window.removeEventListener("massiel:unlock-scroll", onUnlock);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
