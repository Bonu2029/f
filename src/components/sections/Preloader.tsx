"use client";

import { useRef, useState } from "react";
import Logo from "@/components/ui/Logo";
import Particles from "@/components/decor/Particles";
import HairStrands from "@/components/decor/HairStrands";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

/**
 * The cinematic entrance.
 *
 * Sequence: light motes settle → the wordmark fades up and its rule draws
 * across → hair strands flow in behind → the whole veil lifts in two panels,
 * handing the page to the hero mid-motion. Scrolling is locked until it ends,
 * then released with an event the Lenis provider listens for.
 *
 * Skipped entirely under prefers-reduced-motion — the page is simply there.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setDone(true);
      document.documentElement.dataset.entrance = "done";
      return;
    }

    window.dispatchEvent(new Event("massiel:lock-scroll"));
    document.documentElement.dataset.entrance = "running";

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setDone(true);
          document.documentElement.dataset.entrance = "done";
          window.dispatchEvent(new Event("massiel:unlock-scroll"));
          window.dispatchEvent(new Event("massiel:entrance-complete"));
        },
      });

      // Kept deliberately short. The first cut held scrolling for 4.5s, which
      // reads as a slow site rather than as a considered entrance — the whole
      // sequence now clears in well under two.
      tl.set(".pl-mark", { opacity: 0, y: 20, filter: "blur(8px)" })
        .set(".pl-rule", { scaleX: 0, transformOrigin: "center" })
        .set(".pl-strands", { opacity: 0 })

        .to(".pl-mark", {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "silk",
        })
        .to(".pl-rule", { scaleX: 1, duration: 0.6, ease: "drape" }, "-=0.45")
        .to(".pl-strands", { opacity: 1, duration: 0.5 }, "-=0.5")

        .to(".pl-mark, .pl-rule", {
          opacity: 0,
          y: -14,
          filter: "blur(6px)",
          duration: 0.4,
          ease: "power2.in",
        })
        .to(
          ".pl-panel-top",
          { yPercent: -101, duration: 0.7, ease: "drape" },
          "-=0.2",
        )
        .to(
          ".pl-panel-bottom",
          { yPercent: 101, duration: 0.7, ease: "drape" },
          "<",
        )
        .to(el, { autoAlpha: 0, duration: 0.2 }, "-=0.25");
    }, el);

    // Safety net: never trap the page if an animation frame is dropped.
    const failsafe = window.setTimeout(() => {
      window.dispatchEvent(new Event("massiel:unlock-scroll"));
      setDone(true);
    }, 3500);

    return () => {
      window.clearTimeout(failsafe);
      ctx.revert();
      window.dispatchEvent(new Event("massiel:unlock-scroll"));
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[9999] overflow-hidden"
      role="status"
      aria-label="Loading Massiel Beauty Salon"
    >
      <div className="pl-panel-top absolute inset-x-0 top-0 h-1/2 bg-cream" />
      <div className="pl-panel-bottom absolute inset-x-0 bottom-0 h-1/2 bg-cream" />

      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 45%, rgba(239,224,203,0.75), rgba(250,248,245,0) 70%)",
          }}
        />
        <div className="pl-strands absolute inset-0">
          <HairStrands />
        </div>
        <Particles count={30} />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="pl-mark">
          <Logo size="lg" showDescriptor={false} />
        </div>
        <div className="pl-rule mt-5 flex w-[min(20rem,72vw)] items-center gap-3">
          <span className="h-px flex-1 bg-copper/40" />
          <span className="font-sans text-[0.5625rem] font-medium tracking-[0.44em] text-copper">
            BEAUTY SALON
          </span>
          <span className="h-px flex-1 bg-copper/40" />
        </div>
      </div>
    </div>
  );
}
