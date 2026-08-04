"use client";

import { useRef } from "react";
import Art from "@/components/ui/Art";
import Button from "@/components/ui/Button";
import Parallax from "@/components/motion/Parallax";
import SplitLines from "@/components/motion/SplitLines";
import Reveal from "@/components/motion/Reveal";
import Blobs, { FIELD_SERVICES } from "@/components/decor/Blobs";
import { services, pricesAreVerified, ACCENT_HEX, type Service } from "@/lib/services";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

/* ---------------------------------------------------------------- block --- */

function ServiceBlock({ service, index }: { service: Service; index: number }) {
  const root = useRef<HTMLElement>(null);
  const flipped = index % 2 === 1;

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // The copper rule draws itself as the block passes through the viewport.
      gsap.fromTo(
        el.querySelector("[data-rule]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 78%", end: "top 40%", scrub: 0.6 },
        },
      );

      // The index numeral counter-scrolls behind the image.
      gsap.fromTo(
        el.querySelector("[data-numeral]"),
        { yPercent: 22 },
        {
          yPercent: -22,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <article
      ref={root}
      className="group relative grid items-center gap-[clamp(2rem,5vw,4.5rem)] py-[clamp(3.5rem,7vw,6.5rem)] lg:grid-cols-2"
    >
      {/* --------------------------------------------------------- media --- */}
      <div className={`relative ${flipped ? "lg:order-2" : ""}`}>
        {/* Decorative shape the image overlaps */}
        <div
          aria-hidden
          className="animate-morph absolute -inset-6 -z-10 opacity-70 lg:-inset-10"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${ACCENT_HEX[service.accent]}, transparent 68%)`,
            filter: "blur(28px)",
          }}
        />

        <span
          data-numeral
          aria-hidden
          className={`pointer-events-none absolute z-10 font-display text-[clamp(4rem,9vw,8rem)] leading-none text-taupe-deep/35 ${
            flipped ? "-right-2 -top-6 lg:-right-8" : "-left-2 -top-6 lg:-left-8"
          }`}
        >
          {service.index}
        </span>

        <Parallax speed={flipped ? -0.09 : -0.13}>
          <Reveal variant={flipped ? "slide-right" : "slide-left"}>
            {/* No aspect override — each photograph keeps the ratio it was
                delivered at, so nobody gets cropped out of frame. Width is
                capped instead, which is what actually controls block height. */}
            <Art
              slot={service.image}
              frame={service.frame}
              sizes="(max-width: 1024px) 90vw, 44vw"
              className="mx-auto w-full max-w-[30rem] shadow-[0_46px_110px_-50px_rgba(33,30,27,0.42)]"
            />
          </Reveal>
        </Parallax>
      </div>

      {/* ---------------------------------------------------------- copy --- */}
      <div className={`relative ${flipped ? "lg:order-1 lg:pr-[clamp(0rem,4vw,4rem)]" : "lg:pl-[clamp(0rem,4vw,4rem)]"}`}>
        <div className="flex items-center gap-4">
          <span className="eyebrow">{service.kicker}</span>
          <span
            data-rule
            className="rule-copper h-px flex-1 origin-left"
            aria-hidden
          />
        </div>

        <SplitLines
          as="h3"
          mode="words"
          className="mt-5 font-display text-[length:var(--text-title)] text-graphite"
        >
          {service.name}
        </SplitLines>

        <Reveal variant="rise" delay={0.1}>
          <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-[1.7] text-graphite-soft">
            {service.blurb}
          </p>
        </Reveal>

        <Reveal variant="stagger-children" as="ul" className="mt-7 space-y-3" delay={0.05}>
          {service.detail.map((line) => (
            <li key={line} className="flex items-start gap-3 text-[0.9375rem] text-graphite-soft">
              <span
                aria-hidden
                className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full"
                style={{ background: ACCENT_HEX[service.accent] }}
              />
              {line}
            </li>
          ))}
        </Reveal>

        <Reveal variant="rise" delay={0.15}>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <p className="eyebrow text-[0.5625rem]">Duration</p>
              <p className="mt-1.5 font-display text-[1.25rem] text-graphite">
                {service.duration}
              </p>
            </div>
            <div className="h-9 w-px bg-taupe" aria-hidden />
            <div>
              <p className="eyebrow text-[0.5625rem]">Investment</p>
              <p className="mt-1.5 font-display text-[1.25rem] text-graphite">
                {pricesAreVerified ? (
                  <>
                    <span className="text-[0.75rem] align-middle text-graphite-faint">from </span>
                    ${service.priceFrom}
                  </>
                ) : (
                  <span className="text-[1rem] text-graphite-soft">
                    Shared at consultation
                  </span>
                )}
              </p>
            </div>
            <Button href="#booking" variant="outline" size="md" className="ml-auto">
              Book {service.name}
            </Button>
          </div>
        </Reveal>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- section --- */

export default function Services() {
  return (
    <section id="services" className="relative isolate overflow-hidden bg-ivory">
      <Blobs blobs={FIELD_SERVICES} />

      <div className="shell relative py-[clamp(4rem,8vw,7rem)]">
        {/* Editorial header — offset, never centred */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] lg:items-end">
          <div>
            <Reveal variant="rise">
              <p className="eyebrow">The Menu</p>
            </Reveal>
            <SplitLines
              as="h2"
              mode="words"
              className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
            >
              Seven ways to feel like yourself again
            </SplitLines>
          </div>
          <Reveal variant="mask-wipe" className="lg:pb-3">
            <p className="max-w-[32rem] text-[length:var(--text-lede)] leading-[1.7] text-graphite-soft lg:ml-auto">
              Every appointment starts with a consultation, and every price is
              quoted before a single product is opened. No surprises at the desk.
            </p>
          </Reveal>
        </div>

        <div className="mt-[clamp(2rem,5vw,4rem)] divide-y divide-taupe/45">
          {services.map((service, i) => (
            <ServiceBlock key={service.id} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
