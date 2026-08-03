"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, Clock, Scissors } from "@/components/ui/Icons";
import { EASE_EDITORIAL, Reveal, useSafeReducedMotion } from "@/components/ui/motion";
import { services } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/booking";
import { requestBooking } from "@/lib/booking-bus";

export function Services() {
  const reduced = useSafeReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const listRef = useRef<HTMLUListElement>(null);

  const track = (event: React.PointerEvent) => {
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <section id="services" className="relative overflow-hidden bg-ivory-100 py-24 sm:py-32">
      <div className="grain pointer-events-none absolute inset-0" />

      {/* Off-grid sand slab that breaks the section rectangle */}
      <div
        aria-hidden
        className="absolute top-24 -right-24 hidden h-[26rem] w-[26rem] rounded-full bg-sand-200/50 blur-[2px] lg:block"
      />

      <div className="shell relative">
        <SectionHeading
          eyebrow="The Menu"
          lines={["Six services.", "No filler."]}
          intro="Every appointment starts with a consultation and ends with a finish you can repeat at home."
          action={
            <ButtonLink href="#booking" variant="outline" size="md" className="text-navy-900">
              Book a chair
            </ButtonLink>
          }
        />

        <ul
          ref={listRef}
          onPointerMove={track}
          onPointerLeave={() => setActive(null)}
          className="relative mt-16 border-t border-navy-900/12"
        >
          {services.map((service, i) => {
            const isActive = active === i;
            const featured = Boolean(service.feature);

            return (
              <motion.li
                key={service.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: EASE_EDITORIAL }}
                onPointerEnter={() => setActive(i)}
                className={`group relative border-b border-navy-900/12 ${
                  featured ? "bg-burgundy-600/[0.045]" : ""
                }`}
                /* Staggered indent — rows step in and out of the grid. */
                style={{ paddingLeft: `${(i % 3) * 1.25}rem` }}
              >
                {/* Sweeping hover wash */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 ${
                    featured ? "bg-burgundy-600/[0.07]" : "bg-sand-200/45"
                  }`}
                />
                {/* Copper rule that expands under the active row */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px origin-left scale-x-0 bg-copper-500 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                />

                <a
                  href="#booking"
                  onClick={() => requestBooking({ serviceId: service.id })}
                  data-cursor-label="Book"
                  aria-label={`Book ${service.name} — ${formatDuration(service.minutes)}, ${formatPrice(service.price)}`}
                  /* Stacks on phones, becomes a single editorial row from sm up. */
                  className="relative flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-6 sm:py-8"
                >
                  <span className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="w-7 shrink-0 pt-1.5 font-sans text-[0.6875rem] tracking-[0.2em] text-copper-600 tabular-nums sm:w-10 sm:pt-0">
                      {service.index}
                    </span>

                    {/* Inline circular detail — the visible one on touch devices */}
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-navy-900/10 sm:h-14 sm:w-14 lg:hidden">
                      <Image
                        src={service.image.src}
                        alt=""
                        fill
                        sizes="56px"
                        placeholder="blur"
                        blurDataURL={service.image.blurDataURL}
                        className="object-cover"
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                        <span
                          className={`font-display text-[clamp(1.35rem,3vw,2.1rem)] leading-tight transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 ${
                            featured ? "text-burgundy-600" : "text-navy-900"
                          }`}
                        >
                          {service.name}
                        </span>
                        {featured && (
                          <span className="shrink-0 rounded-full border border-burgundy-600/35 px-2.5 py-1 font-sans text-[0.5625rem] tracking-[0.18em] text-burgundy-600 uppercase">
                            The full sit
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block max-w-md text-sm leading-relaxed text-navy-800/70">
                        {service.blurb}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center justify-between gap-4 pl-11 sm:justify-end sm:gap-8 sm:pl-0">
                    <span className="inline-flex items-center gap-1.5 font-sans text-[0.6875rem] tracking-[0.14em] text-navy-800/55 uppercase">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(service.minutes)}
                    </span>

                    {/* Price slides up into view on hover */}
                    <span className="relative block h-7 w-[4.5rem] overflow-hidden text-right">
                      <span className="absolute inset-0 flex items-center justify-end font-display text-xl text-navy-900 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full group-hover:opacity-0">
                        {formatPrice(service.price)}
                      </span>
                      <span className="absolute inset-0 flex translate-y-full items-center justify-end font-display text-xl text-copper-600 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                        {formatPrice(service.price)}
                      </span>
                    </span>

                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        featured
                          ? "border-burgundy-600/30 text-burgundy-600 group-hover:bg-burgundy-600 group-hover:text-ivory-50"
                          : "border-navy-900/20 text-navy-900 group-hover:border-copper-500 group-hover:bg-copper-500 group-hover:text-ivory-50"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" />
                    </span>
                  </span>
                </a>
              </motion.li>
            );
          })}

          {/* Cursor-following circular preview (desktop only) */}
          {!reduced && (
            <AnimatePresence>
              {active !== null && (
                <motion.div
                  key="service-preview"
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
                  className="pointer-events-none absolute z-20 hidden lg:block"
                  style={{ left: pointer.x, top: pointer.y, translate: "-50% -50%" }}
                >
                  <motion.div
                    animate={{ x: 0, y: 0 }}
                    className="relative h-40 w-40 overflow-hidden rounded-full shadow-[0_28px_60px_-24px_rgba(14,26,43,0.6)] ring-1 ring-copper-500/40"
                  >
                    <Image
                      src={services[active].image.src}
                      alt=""
                      fill
                      sizes="160px"
                      placeholder="blur"
                      blurDataURL={services[active].image.blurDataURL}
                      className="scale-105 object-cover"
                    />
                    <span className="absolute inset-0 bg-navy-950/15" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </ul>

        <Reveal delay={0.1}>
          <p className="mt-8 flex items-center gap-3 text-[0.8125rem] text-navy-800/60">
            <Scissors className="h-4 w-4 shrink-0 text-copper-600" />
            Student and NHS rate: £6 off any service, Tuesday to Thursday.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
