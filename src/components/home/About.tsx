"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CountUp, MaskedLines, Reveal, useParallax } from "@/components/ui/motion";
import { media } from "@/lib/media";
import { reviewStats, shop } from "@/lib/data";

const stats = reviewStats();

const FACTS = [
  { value: new Date().getFullYear() - shop.founded, suffix: "", label: "Years on Calder Row" },
  { value: 4, suffix: "", label: "Chairs, never rushed" },
  { value: stats.average, suffix: " / 5", label: "Average rating", decimal: true },
];

export function About() {
  const { ref, y } = useParallax(38);

  return (
    <section id="about" className="relative overflow-hidden bg-ivory-100 pt-8 pb-24 sm:pb-32">
      <div className="grain pointer-events-none absolute inset-0" />

      {/* Sand block that the text column overlaps */}
      <div
        aria-hidden
        className="absolute top-1/2 right-0 hidden h-[70%] w-1/3 -translate-y-1/2 bg-sand-200/55 lg:block"
      />

      <div className="shell relative grid items-center gap-10 lg:grid-cols-12 lg:gap-0">
        {/* Image, arched and offset */}
        <div ref={ref} className="relative lg:col-span-5 lg:col-start-1">
          <motion.div style={{ y }} className="relative">
            <div className="arch relative aspect-[3/4] overflow-hidden bg-navy-900">
              <Image
                src={media["about-craft"].src}
                alt="A barber cutting a client's hair with shears and comb at Ashgrove Barber Co."
                fill
                sizes="(max-width: 1024px) 90vw, 40vw"
                placeholder="blur"
                blurDataURL={media["about-craft"].blurDataURL}
                className="object-cover"
              />
              <span aria-hidden className="hairline-frame arch absolute inset-0" />
            </div>

            {/* Est. badge — tucked inside the arch on phones, floated out at desktop */}
            <div
              className="absolute bottom-5 left-5 z-20 flex h-24 w-24 flex-col items-center justify-center
                         rounded-full bg-navy-900 text-ivory-100 shadow-[0_20px_40px_-20px_rgba(14,26,43,0.8)]
                         lg:-bottom-7 lg:-left-8 lg:h-28 lg:w-28"
            >
              <span className="font-sans text-[0.5rem] tracking-[0.24em] text-copper-300 uppercase">
                Est
              </span>
              <span className="font-display text-2xl">{shop.founded}</span>
              <span className="mt-0.5 font-sans text-[0.5rem] tracking-[0.18em] text-steel-400 uppercase">
                {shop.district}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Text column overlapping the image */}
        <div className="relative lg:col-span-7 lg:col-start-6 lg:-ml-10 lg:rounded-l-[2rem] lg:bg-ivory-100/95 lg:py-16 lg:pl-16 lg:backdrop-blur-sm">
          <Reveal>
            <span className="eyebrow text-copper-600">Our Story</span>
          </Reveal>

          <MaskedLines
            as="h2"
            lines={["A shop built", "around the chair."]}
            className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05] text-navy-900"
          />

          <Reveal delay={0.15}>
            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-navy-800/75">
              Marcus opened Ashgrove in {shop.founded} with two chairs, a barber pole and
              a rule that still holds: nobody leaves before the cut is right. Four chairs
              later, the rule hasn't moved.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-navy-800/75">
              We cut dry, check twice and finish with something you can actually repeat at
              home. Book the barber you get on with — most people here have had the same
              hands for years.
            </p>
          </Reveal>

          <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-navy-900/12 pt-8">
            {FACTS.map((fact, i) => (
              <Reveal key={fact.label} delay={0.28 + i * 0.08}>
                <p className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none text-navy-900">
                  {fact.decimal ? (
                    <>
                      {fact.value.toFixed(1)}
                      <span className="text-lg text-navy-800/45">{fact.suffix}</span>
                    </>
                  ) : (
                    <CountUp to={fact.value} suffix={fact.suffix} />
                  )}
                </p>
                <p className="mt-2.5 font-sans text-[0.625rem] leading-relaxed tracking-[0.14em] text-navy-800/55 uppercase">
                  {fact.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
