"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { useLayoutEffect, useEffect } from "react";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);

  // The house easing curve — everything decelerates like heavy silk.
  CustomEase.create("silk", "0.22, 1, 0.36, 1");
  CustomEase.create("drape", "0.65, 0, 0.35, 1");

  gsap.defaults({ ease: "silk", duration: 1.1 });
  registered = true;
}

/** SSR-safe layout effect — GSAP setup must run before paint on the client. */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin };
