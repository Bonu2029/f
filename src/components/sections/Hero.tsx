"use client";

import { useRef } from "react";
import Art from "@/components/ui/Art";
import Button from "@/components/ui/Button";
import SplitLines from "@/components/motion/SplitLines";
import Parallax from "@/components/motion/Parallax";
import HairStrands from "@/components/decor/HairStrands";
import Particles from "@/components/decor/Particles";
import Blobs, { FIELD_HERO } from "@/components/decor/Blobs";
import OpenStatus from "@/components/ui/OpenStatus";
import { GoogleMark, Stars } from "@/components/ui/GoogleMark";
import { heroChips } from "@/lib/services";
import { reviewLinks } from "@/lib/reviews";
import type { ReviewsPayload } from "@/lib/reviews";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

/** Chip positions are hand-placed per breakpoint — never an even grid. */
const CHIP_POS = [
  "left-[-2.5rem] top-[10%]",
  "right-[-2.5rem] top-[34%]",
  "left-[-4rem] top-[54%]",
  "right-[-1.5rem] bottom-[14%]",
];

export default function Hero({ reviews }: { reviews: ReviewsPayload }) {
  const root = useRef<HTMLElement>(null);
  const links = reviewLinks(reviews);

  useIsoLayoutEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      // No clearProps here — it would drop the opacity we just set and hand
      // the elements back to their `will-reveal` (opacity: 0) class.
      gsap.set(el.querySelectorAll("[data-hero]"), {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        clipPath: "none",
        filter: "none",
      });
      return;
    }

    // The entrance fires after the preloader hands over, i.e. outside the
    // synchronous run of gsap.context — so its selector scoping no longer
    // applies. Resolve real elements against the root instead of passing
    // strings, or the timeline silently animates nothing.
    const pick = (name: string) =>
      Array.from(el.querySelectorAll<HTMLElement>(`[data-hero='${name}']`));

    const ctx = gsap.context(() => {
      const start = () => {
        const tl = gsap.timeline({ delay: 0.1 });

        // The image reveals itself behind a rising mask while the camera
        // pushes in — the entrance continues rather than restarting.
        tl.fromTo(
          pick("frame"),
          { clipPath: "inset(100% 0% 0% 0%)", scale: 1.14, opacity: 1 },
          { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.9, ease: "drape" },
        )
          .fromTo(
            pick("eyebrow"),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 1 },
            0.15,
          )
          .fromTo(
            pick("lede"),
            { opacity: 0, y: 26 },
            { opacity: 1, y: 0, duration: 1.1 },
            0.85,
          )
          .fromTo(
            Array.from(el.querySelectorAll<HTMLElement>("[data-hero='cta'] > *")),
            { opacity: 0, y: 34 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.11 },
            1.0,
          )
          .fromTo(
            pick("badge"),
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 },
            1.15,
          )
          .fromTo(
            pick("float"),
            { opacity: 0, scale: 0.86, y: 30 },
            { opacity: 1, scale: 1, y: 0, duration: 1.1, stagger: 0.13, ease: "back.out(1.5)" },
            1.0,
          )
          .fromTo(
            pick("chip"),
            { opacity: 0, x: 18, filter: "blur(8px)" },
            { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.1 },
            1.3,
          )
          .fromTo(pick("cue"), { opacity: 0 }, { opacity: 1, duration: 0.9 }, 1.7);

        // Floating cards drift independently, each on its own clock.
        pick("chip").forEach((chip, i) => {
          gsap.to(chip, {
            y: i % 2 === 0 ? -13 : 11,
            x: i % 3 === 0 ? 7 : -6,
            duration: 5.5 + i * 1.3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 2 + i * 0.3,
          });
        });
      };

      if (document.documentElement.dataset.entrance === "done") start();
      else window.addEventListener("massiel:entrance-complete", start, { once: true });

      // If the entrance never completes, the hero must still appear.
      window.setTimeout(() => {
        const stuck = pick("lede")[0];
        if (stuck && getComputedStyle(stuck).opacity === "0") start();
      }, 9000);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="top"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-[clamp(3rem,7vw,6rem)] pt-[clamp(6.5rem,11vw,9rem)]"
    >
      <Blobs blobs={FIELD_HERO} />
      <div className="absolute inset-0 opacity-70">
        <HairStrands draw={false} />
      </div>
      <Particles count={22} />

      <div className="shell relative w-full">
        <div className="grid items-center gap-[clamp(3.5rem,6vw,5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)]">
          {/* ---------------------------------------------------- Copy --- */}
          <div className="relative z-10 max-w-[40rem]">
            <p data-hero="eyebrow" className="eyebrow will-reveal">
              Allentown, Pennsylvania
            </p>

            <SplitLines
              as="h1"
              immediate
              delay={0.35}
              stagger={0.085}
              className="mt-6 font-display text-[length:var(--text-hero)] leading-[0.92] text-graphite"
            >
              Luxury Hair &amp; Beauty Experience
            </SplitLines>

            <p
              data-hero="lede"
              className="mt-7 max-w-[34rem] text-[length:var(--text-lede)] leading-[1.65] text-graphite-soft will-reveal"
            >
              A small studio where colour is mixed for your hair, appointments are
              never rushed, and you leave with something you can actually recreate
              at home.
            </p>

            <div data-hero="cta" className="mt-10 flex flex-wrap items-center gap-3">
              <Button href="#booking" size="lg" className="will-reveal">
                Book Appointment
              </Button>
              <Button href="#services" size="lg" variant="outline" className="will-reveal">
                Explore Services
              </Button>
            </div>

            {/* Badges — hours and Google, side by side */}
            <div className="mt-10 flex flex-wrap items-stretch gap-3">
              <div
                data-hero="badge"
                className="glass flex items-center gap-3 rounded-full px-5 py-3 will-reveal"
              >
                <span className="eyebrow text-[0.5625rem]">Hours</span>
                <span className="h-4 w-px bg-taupe" aria-hidden />
                <span className="text-graphite-soft">
                  <OpenStatus />
                </span>
              </div>

              <a
                data-hero="badge"
                href={links.read}
                target="_blank"
                rel="noreferrer noopener"
                className="glass group flex items-center gap-3 rounded-full px-5 py-3 will-reveal transition-shadow duration-300 hover:shadow-[0_20px_50px_-22px_rgba(154,90,50,0.45)]"
              >
                <GoogleMark />
                {reviews.rating ? (
                  <>
                    <span className="font-display text-[1.0625rem] leading-none text-graphite">
                      {reviews.rating.toFixed(1)}
                    </span>
                    <Stars rating={reviews.rating} size={12} />
                    {reviews.total ? (
                      <span className="text-[0.75rem] text-graphite-faint">
                        ({reviews.total})
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[0.8125rem] text-graphite-soft">
                    Reviews on Google
                  </span>
                )}
                <span className="text-copper transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </a>
            </div>
          </div>

          {/* -------------------------------------------------- Imagery --- */}
          <div className="relative">
            {/* Decorative ring behind the composition */}
            <div
              aria-hidden
              className="absolute -inset-x-8 -top-10 bottom-4 rounded-[50%] border border-copper/15"
            />

            <Parallax speed={-0.07} zoom={0.02} className="relative">
              <div
                data-hero="frame"
                className="group relative mx-auto w-[min(25rem,80vw)] lg:mx-0 lg:ml-auto"
              >
                <Art
                  slot="hero-primary"
                  frame="arch"
                  priority
                  sizes="(max-width: 1024px) 86vw, 34vw"
                  className="shadow-[0_50px_120px_-45px_rgba(33,30,27,0.35)]"
                />
              </div>
            </Parallax>

            {/* Overlapping secondary image */}
            <Parallax
              speed={0.12}
              className="absolute -bottom-[3.5rem] -left-2 z-20 w-[38%] max-w-[13rem] sm:-left-8 lg:-left-16"
            >
              <div data-hero="float" className="group will-reveal">
                <Art
                  slot="hero-secondary"
                  frame="petal"
                  sizes="(max-width: 1024px) 34vw, 14vw"
                  className="shadow-[0_34px_80px_-34px_rgba(33,30,27,0.4)] ring-4 ring-cream"
                />
              </div>
            </Parallax>

            {/* Small circular detail */}
            <Parallax
              speed={-0.2}
              className="absolute -right-2 top-[-2.5rem] z-20 hidden w-[24%] max-w-[8.5rem] md:block"
            >
              <div data-hero="float" className="group animate-bob will-reveal">
                <Art
                  slot="hero-detail"
                  frame="none"
                  sizes="12vw"
                  className="rounded-full shadow-[0_26px_60px_-28px_rgba(33,30,27,0.45)] ring-4 ring-cream"
                />
              </div>
            </Parallax>

            {/* Floating service chips — desktop only, hand-placed */}
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
              {heroChips.map((chip, i) => (
                <a
                  key={chip.label}
                  href={chip.href}
                  data-hero="chip"
                  className={`glass pointer-events-auto absolute ${CHIP_POS[i]} flex items-center gap-2.5 rounded-full px-4 py-2.5 will-reveal transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(154,90,50,0.5)]`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: ["#EFE0CB", "#D2CCDD", "#D9D0C4", "#E6C6BD"][i],
                    }}
                  />
                  <span className="text-[0.75rem] tracking-[0.14em] text-graphite">
                    {chip.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile chip rail — a scroll strip rather than stacked cards */}
        <ul className="no-scrollbar mask-fade-x -mx-[var(--spacing-gutter)] mt-12 flex snap-x gap-3 overflow-x-auto px-[var(--spacing-gutter)] lg:hidden">
          {heroChips.map((chip, i) => (
            <li key={chip.label} className="snap-start">
              <a
                href={chip.href}
                data-hero="chip"
                className="glass flex min-h-[44px] items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-3 will-reveal"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: ["#EFE0CB", "#D2CCDD", "#D9D0C4", "#E6C6BD"][i] }}
                />
                <span className="text-[0.8125rem] tracking-[0.12em] text-graphite">
                  {chip.label}
                </span>
              </a>
            </li>
          ))}
        </ul>

        {/* Scroll cue */}
        <div
          data-hero="cue"
          className="mt-16 hidden items-center gap-4 will-reveal lg:flex"
          aria-hidden
        >
          <span className="font-sans text-[0.5625rem] tracking-[0.4em] text-graphite-faint">
            SCROLL
          </span>
          <span className="relative h-px w-24 overflow-hidden bg-taupe">
            <span className="absolute inset-y-0 left-0 w-1/3 animate-[marquee_2.6s_linear_infinite] bg-copper" />
          </span>
        </div>
      </div>
    </section>
  );
}
