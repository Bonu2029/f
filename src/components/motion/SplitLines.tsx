"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import {
  gsap,
  SplitText,
  registerGsap,
  useIsoLayoutEffect,
  prefersReducedMotion,
} from "@/lib/gsap";
import { useNearViewport } from "@/lib/useNearViewport";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** words: the hero headline lands one word at a time. lines: body copy. */
  mode?: "words" | "lines" | "chars";
  delay?: number;
  stagger?: number;
  /** Fire on mount (hero) instead of waiting for scroll. */
  immediate?: boolean;
  start?: string;
};

/**
 * Typographic reveal. Words rise out of an invisible baseline mask, which is
 * what makes an editorial headline feel typeset rather than animated.
 */
export default function SplitLines({
  children,
  as: Tag = "div",
  className = "",
  mode = "words",
  delay = 0,
  stagger,
  immediate = false,
  start = "top 84%",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  // The hero headline must split on mount; everything else waits its turn so
  // SplitText isn't rewriting a dozen headings during hydration.
  const near = useNearViewport(ref);
  const ready = immediate || near;

  useIsoLayoutEffect(() => {
    if (!ready) return;
    registerGsap();
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    let split: SplitText | null = null;

    const ctx = gsap.context(() => {
      split = new SplitText(el, {
        type: mode === "chars" ? "chars,words" : mode === "lines" ? "lines" : "words,lines",
        linesClass: "overflow-hidden pb-[0.12em] -mb-[0.12em]",
        wordsClass: "inline-block",
        charsClass: "inline-block",
      });

      const targets =
        mode === "chars" ? split.chars : mode === "lines" ? split.lines : split.words;

      gsap.set(el, { opacity: 1 });
      gsap.fromTo(
        targets,
        { yPercent: 118, opacity: 0, rotate: mode === "words" ? 2 : 0 },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 1.25,
          delay,
          stagger: stagger ?? (mode === "chars" ? 0.022 : 0.075),
          ease: "silk",
          ...(immediate
            ? {}
            : { scrollTrigger: { trigger: el, start, once: true } }),
        },
      );
    }, el);

    return () => {
      split?.revert();
      ctx.revert();
    };
  }, [ready, mode, delay, stagger, immediate, start]);

  return (
    <Tag ref={ref} className={`will-reveal ${className}`}>
      {children}
    </Tag>
  );
}
