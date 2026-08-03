"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowUpRight } from "@/components/ui/Icons";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";
import { barbers, yearsOfExperience } from "@/lib/data";
import { requestBooking } from "@/lib/booking-bus";

/** Portraits sit at different heights so the row reads as a composition. */
const OFFSETS = ["lg:mt-0", "lg:mt-16", "lg:mt-6", "lg:mt-24"];

export function Barbers() {
  const reduced = useSafeReducedMotion();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="barbers" className="relative overflow-hidden bg-ivory-200 py-24 sm:py-32">
      <div className="grain pointer-events-none absolute inset-0" />

      {/* Vertical rail label */}
      <span
        aria-hidden
        className="absolute top-1/2 left-6 hidden -translate-y-1/2 -rotate-90 font-sans text-[0.625rem]
                   tracking-[0.44em] text-navy-900/25 uppercase xl:block"
      >
        The Chair · The Hands · The Eye
      </span>

      <div className="shell relative">
        <SectionHeading
          eyebrow="The Team"
          lines={["Four barbers.", "One standard."]}
          intro="Book the person, not the shop. Every chair here has a name on it."
        />

        <div className="mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {barbers.map((barber, i) => {
            const isOpen = open === barber.id;

            return (
              <motion.article
                key={barber.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.8, delay: i * 0.09, ease: EASE_EDITORIAL }}
                className={`group relative ${OFFSETS[i % OFFSETS.length]}`}
                onMouseEnter={() => setOpen(barber.id)}
                onMouseLeave={() => setOpen(null)}
                onFocusCapture={() => setOpen(barber.id)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(null);
                }}
              >
                {/* Oversized ghost number, set outside the arch so it stays readable */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -left-6 z-0 font-display text-[7.5rem]
                             leading-[0.8] font-bold text-navy-900/[0.09] transition-transform
                             duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2"
                >
                  {barber.index}
                </span>

                <div className="relative z-10">
                  <div className="arch-soft relative aspect-[3/4] overflow-hidden bg-navy-900">
                    <motion.div
                      className="absolute inset-0"
                      animate={reduced ? {} : { scale: isOpen ? 1.07 : 1 }}
                      transition={{ duration: 1, ease: EASE_EDITORIAL }}
                    >
                      <Image
                        src={barber.image.src}
                        alt={barber.imageAlt}
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 23vw"
                        placeholder="blur"
                        blurDataURL={barber.image.blurDataURL}
                        className="object-cover object-top"
                      />
                    </motion.div>

                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(8,17,29,0.82)_100%)]"
                    />
                    <span aria-hidden className="hairline-frame arch-soft absolute inset-0" />

                    {/* Years badge — sits below the arch curve so it never clips */}
                    <span
                      className="absolute top-1/3 left-4 rounded-full bg-ivory-100/92 px-3 py-1.5
                                 font-sans text-[0.5625rem] tracking-[0.16em] text-navy-900 uppercase
                                 backdrop-blur-sm transition-opacity duration-500 group-hover:opacity-0"
                    >
                      {yearsOfExperience(barber.since)} yrs
                    </span>

                    {/* Hover / focus overlay */}
                    <motion.div
                      initial={false}
                      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 16 }}
                      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
                      className="absolute inset-x-0 bottom-0 p-5"
                    >
                      <p className="text-[0.8125rem] leading-relaxed text-ivory-100/90">{barber.bio}</p>
                      <button
                        type="button"
                        onClick={() => requestBooking({ barberId: barber.id })}
                        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-copper-500
                                   px-4 py-2.5 font-sans text-[0.5625rem] tracking-[0.18em] text-ivory-50
                                   uppercase transition-colors hover:bg-copper-600"
                      >
                        Book with {barber.name.split(" ")[0]}
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </motion.div>
                  </div>

                  <div className="mt-5 flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-2 h-px w-6 shrink-0 bg-copper-500 transition-all duration-500
                                 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-10"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-xl leading-tight text-navy-900">{barber.name}</h3>
                      <p className="mt-1 text-[0.75rem] text-navy-800/60">{barber.role}</p>
                      <p className="mt-1.5 font-sans text-[0.625rem] tracking-[0.16em] text-copper-600 uppercase">
                        {barber.specialty}
                      </p>
                    </div>
                  </div>

                  {/* Always-available booking affordance for touch + keyboard */}
                  <a
                    href="#booking"
                    onClick={() => requestBooking({ barberId: barber.id })}
                    className="mt-4 inline-flex items-center gap-2 border-b border-navy-900/20 pb-1
                               font-sans text-[0.625rem] tracking-[0.18em] text-navy-900 uppercase
                               transition-colors hover:border-copper-500 hover:text-copper-600 lg:hidden"
                  >
                    Book with {barber.name.split(" ")[0]}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
