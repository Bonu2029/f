"use client";

import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight } from "@/components/ui/Icons";
import { MaskedLines, Reveal, useSafeReducedMotion } from "@/components/ui/motion";

export function Promo() {
  const reduced = useSafeReducedMotion();

  return (
    <section
      aria-labelledby="promo-heading"
      className="relative isolate overflow-hidden bg-burgundy-700 py-20 text-ivory-100 sm:py-24"
    >
      {/* Slow diagonal weave drifting behind the copy */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.16]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 26px, var(--color-copper-300) 26px 27px)",
        }}
      />
      <motion.div
          aria-hidden
          className="absolute inset-y-0 -z-10 w-[220%] opacity-[0.12] motion-reduce:hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(65deg, transparent 0 40px, var(--color-ivory-100) 40px 41px)",
          }}
          animate={reduced ? undefined : { x: ["0%", "-9.1%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_15%_50%,rgba(87,26,40,0.35),rgba(87,26,40,0.9))]"
      />

      {/* Copper hairlines top and bottom */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px rule-copper opacity-70" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px rule-copper opacity-70" />

      <div className="shell relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div>
          <Reveal>
            <span className="eyebrow text-copper-300">First Visit</span>
          </Reveal>

          <MaskedLines
            as="h2"
            id="promo-heading"
            lines={[
              <>
                15% off your first
              </>,
              <>
                <em className="font-normal text-copper-300 italic">premium grooming</em> service.
              </>,
            ]}
            className="mt-5 max-w-2xl font-display text-[clamp(1.85rem,4.4vw,3.1rem)] leading-[1.08]"
          />

          <Reveal delay={0.18}>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ivory-100/75">
              Mention it at the chair, or add it to the notes when you book. One per
              customer, no expiry.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.26} className="shrink-0">
          <motion.div
            animate={reduced ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ButtonLink
              href="#booking"
              size="lg"
              variant="ivory"
              icon={<ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />}
            >
              Claim it with a booking
            </ButtonLink>
          </motion.div>
        </Reveal>
      </div>

      {/* Barely-there scrolling wordmark */}
      <div
        aria-hidden
        className="pointer-events-none mt-14 overflow-hidden opacity-[0.07] motion-reduce:hidden"
      >
        <div
          className="marquee-track flex w-max gap-10 font-display text-6xl whitespace-nowrap uppercase sm:text-8xl"
          style={{ ["--marquee-duration" as string]: "48s" }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>Ashgrove Barber Co ·</span>
          ))}
        </div>
      </div>
    </section>
  );
}
