"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { Stars } from "@/components/ui/Stars";
import { ArrowUpRight } from "@/components/ui/Icons";
import { CountUp, EASE_EDITORIAL, Reveal } from "@/components/ui/motion";
import { highlightedReviews, reviews, reviewStats } from "@/lib/data";

const stats = reviewStats();

export function Reviews() {
  const [paused, setPaused] = useState(false);

  /* Duplicated once so the marquee can loop seamlessly at -50%. */
  const lane = [...reviews, ...reviews];

  return (
    <section id="reviews" className="relative overflow-hidden bg-ivory-100 py-24 sm:py-32">
      <div className="grain pointer-events-none absolute inset-0" />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Reviews"
          lines={["What the chair", "gets told."]}
          intro="Collected in the shop after the cut. Every review here is tied to a real appointment."
          action={
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/reviews"
                variant="outline"
                size="md"
                className="text-navy-900"
                icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />}
              >
                Read All Reviews
              </ButtonLink>
              <ButtonLink href="/reviews#leave-a-review" size="md">
                Leave a Review
              </ButtonLink>
            </div>
          }
        />

        {/* Rating summary + three highlights, overlapping */}
        <div className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_2fr] lg:items-start">
          <Reveal>
            <div className="relative rounded-[1.5rem] border border-navy-900/10 bg-sand-200/45 p-8">
              <span
                aria-hidden
                className="absolute -top-3 -right-3 h-16 w-16 rounded-full border border-copper-500/35"
              />
              <p className="flex items-baseline gap-2">
                <span className="font-display text-6xl leading-none text-navy-900">
                  {stats.average.toFixed(1)}
                </span>
                <span className="font-sans text-sm text-navy-800/50">/ 5</span>
              </p>
              <Stars value={stats.average} size={18} className="mt-4" />
              <p className="mt-4 text-sm text-navy-800/65">
                Across <CountUp to={stats.total} /> verified appointments
              </p>

              <dl className="mt-7 flex flex-col gap-2.5 border-t border-navy-900/10 pt-6">
                {stats.distribution
                  .filter((row) => row.count > 0)
                  .map((row) => (
                    <div key={row.stars} className="flex items-center gap-3 text-[0.75rem]">
                      <dt className="w-8 shrink-0 tabular-nums text-navy-800/60">{row.stars}★</dt>
                      <dd className="flex flex-1 items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-900/10">
                          <motion.span
                            className="block h-full rounded-full bg-copper-500"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${row.percent}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: EASE_EDITORIAL }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right tabular-nums text-navy-800/50">
                          {row.percent}%
                        </span>
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-3">
            {highlightedReviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: EASE_EDITORIAL }}
                /* Cards sit at staggered heights so the row isn't a flat strip. */
                className={i === 1 ? "sm:mt-8" : i === 2 ? "sm:mt-4" : ""}
              >
                <ReviewCard review={review} featured className="h-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Continuous carousel — pauses on hover and on focus within */}
      <div
        className="relative mt-16 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ivory-100 to-transparent sm:w-32"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ivory-100 to-transparent sm:w-32"
        />

        <div
          className="marquee-track flex w-max gap-5 px-5"
          style={{
            ["--marquee-duration" as string]: "72s",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {lane.map((review, i) => (
            <div key={`${review.id}-${i}`} className="w-[19rem] shrink-0 sm:w-[22rem]">
              <ReviewCard review={review} className="h-full" />
            </div>
          ))}
        </div>

        <p className="shell mt-6 text-[0.6875rem] tracking-[0.14em] text-navy-800/40 uppercase">
          Hover to pause
        </p>
      </div>
    </section>
  );
}
