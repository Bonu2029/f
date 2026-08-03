"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { ArrowUpRight, ChevronDown, Scissors, Razor } from "@/components/ui/Icons";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";
import { media } from "@/lib/media";
import { shop } from "@/lib/data";
import { openState } from "@/lib/booking";

const HEADLINE = ["Precision Cuts.", "Elevated Style."];

export function Hero() {
  const reduced = useSafeReducedMotion();
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);

  /* Opening state depends on the clock, so it resolves after hydration. */
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);
  useEffect(() => {
    setStatus(openState());
    const timer = window.setInterval(() => setStatus(openState()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /* Scroll parallax: the plate drifts slower than the page, the veil deepens. */
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });
      tl.to(frame.current, { yPercent: 16, scale: 1.06, ease: "none" }, 0)
        .to(veil.current, { opacity: 0.92, ease: "none" }, 0)
        .to(copy.current, { yPercent: -14, opacity: 0.15, ease: "none" }, 0);
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="top"
      ref={section}
      aria-label="Ashgrove Barber Co."
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-navy-950 pb-14 sm:pb-20"
    >
      {/* ── Plate: slow cinematic push-in ── */}
      <div ref={frame} className="absolute inset-0 -z-20 will-change-transform">
        <motion.div
          className="relative h-[112%] w-full"
          initial={{ scale: 1.16, x: "-1.5%" }}
          animate={reduced ? { scale: 1, x: "0%" } : { scale: 1.03, x: "1.5%" }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 34, ease: "linear", repeat: Infinity, repeatType: "reverse" }
          }
        >
          <Image
            src={media["hero-interior"].src}
            alt="The Ashgrove Barber Co. floor — navy panelling, copper-framed arched mirrors and steel blue barber chairs"
            fill
            priority
            sizes="100vw"
            quality={82}
            placeholder="blur"
            blurDataURL={media["hero-interior"].blurDataURL}
            className="object-cover object-center"
          />
        </motion.div>
      </div>

      {/* ── Navy veil ── */}
      <div
        ref={veil}
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,17,29,0.86)_0%,rgba(8,17,29,0.5)_38%,rgba(14,26,43,0.72)_72%,rgba(8,17,29,0.95)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_10%,transparent_35%,rgba(8,17,29,0.75)_100%)]"
      />

      {/* ── Soft floating light reflections ── */}
      {/* Rendered unconditionally and hidden with CSS so the server and client
          trees always match; the animation itself is dropped when reduced. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden motion-reduce:hidden"
      >
          {[
            { size: 520, x: "8%", y: "18%", hue: "rgba(205,139,81,0.16)", dur: 19 },
            { size: 380, x: "72%", y: "12%", hue: "rgba(139,163,186,0.14)", dur: 24 },
            { size: 640, x: "58%", y: "62%", hue: "rgba(180,112,63,0.10)", dur: 30 },
          ].map((glow, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: glow.size,
                height: glow.size,
                left: glow.x,
                top: glow.y,
                background: `radial-gradient(circle, ${glow.hue} 0%, transparent 68%)`,
              }}
              animate={
                reduced ? undefined : { x: [0, 34, -22, 0], y: [0, -26, 18, 0], opacity: [0.5, 0.85, 0.6, 0.5] }
              }
              transition={{ duration: glow.dur, repeat: Infinity, ease: "easeInOut" }}
            />
        ))}
      </div>

      {/* ── Drifting tools, barely there ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden motion-reduce:hidden"
      >
        <motion.div
          className="absolute top-[22%] left-[6%] text-ivory-100/[0.07]"
          animate={reduced ? undefined : { y: [0, -22, 0], rotate: [-8, 4, -8] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        >
          <Scissors className="h-40 w-40" strokeWidth={0.6} />
        </motion.div>
        <motion.div
          className="absolute top-[54%] right-[8%] text-copper-300/[0.09]"
          animate={reduced ? undefined : { y: [0, 26, 0], rotate: [10, -4, 10] }}
          transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        >
          <Razor className="h-32 w-32" strokeWidth={0.6} />
        </motion.div>
      </div>

      {/* ── Copper hairlines drawing into place ── */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {[
          { d: "M0 68 H100", delay: 1.15 },
          { d: "M12 0 V100", delay: 1.35 },
          { d: "M88 0 V100", delay: 1.45 },
        ].map((line, i) => (
          <motion.path
            key={i}
            d={line.d}
            stroke="var(--color-copper-500)"
            strokeWidth="0.12"
            fill="none"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 1.8, delay: line.delay, ease: EASE_EDITORIAL }
            }
          />
        ))}
      </svg>

      {/* ── Copy ── */}
      <div ref={copy} className="shell relative z-10 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: EASE_EDITORIAL }}
          className="flex items-center gap-4 text-ivory-100"
        >
          <LogoMark className="h-11 w-auto text-copper-400" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-[0.2em] uppercase">
              Ashgrove
            </span>
            <span className="mt-1.5 font-sans text-[0.5625rem] tracking-[0.34em] text-copper-300 uppercase">
              Barber Co · {shop.district} · Est {shop.founded}
            </span>
          </span>
        </motion.div>

        <h1 className="mt-9 max-w-4xl font-display text-[clamp(2.75rem,9vw,7rem)] leading-[0.96] font-semibold text-ivory-50">
          {HEADLINE.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block will-change-transform"
                initial={{ y: "112%" }}
                animate={{ y: "0%" }}
                transition={{
                  duration: reduced ? 0 : 1.15,
                  delay: reduced ? 0 : 0.62 + i * 0.13,
                  ease: EASE_EDITORIAL,
                }}
              >
                {i === 1 ? (
                  <>
                    Elevated <em className="font-normal text-copper-300 italic">Style.</em>
                  </>
                ) : (
                  line
                )}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1, ease: EASE_EDITORIAL }}
          className="mt-7 max-w-md text-[0.9375rem] leading-relaxed text-steel-200"
        >
          Four chairs in {shop.district}, one standard. Book the barber you trust and
          keep the chair that suits you.
        </motion.p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          {[
            { key: "book", node: <ButtonLink href="#booking" size="lg" icon={<ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />}>Book Your Appointment</ButtonLink> },
            { key: "services", node: <ButtonLink href="#services" size="lg" variant="outline" className="text-ivory-100">Explore Services</ButtonLink> },
          ].map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.18 + i * 0.12, ease: EASE_EDITORIAL }}
            >
              {item.node}
            </motion.div>
          ))}
        </div>

        {/* ── Hours indicator + scroll cue ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-ivory-100/15 pt-6"
        >
          <p className="flex items-center gap-3 text-[0.6875rem] tracking-[0.2em] text-ivory-100/80 uppercase">
            <span className="relative flex h-2 w-2 shrink-0">
              {status?.open && !reduced && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-copper-400 opacity-70" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  status?.open ? "bg-copper-400" : "bg-steel-500"
                }`}
              />
            </span>
            {status?.label ?? "Opening hours"}
          </p>

          <a
            href="#services"
            aria-label="Scroll to services"
            className="group hidden items-center gap-3 text-[0.625rem] tracking-[0.24em] text-ivory-100/60 uppercase transition-colors hover:text-copper-300 sm:inline-flex"
          >
            Scroll
            <motion.span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory-100/25 group-hover:border-copper-400"
              animate={reduced ? {} : { y: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
