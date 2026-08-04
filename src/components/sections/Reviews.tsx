"use client";

import { useRef, useState } from "react";
import Art from "@/components/ui/Art";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Button from "@/components/ui/Button";
import Divider from "@/components/decor/Divider";
import { GoogleMark, Stars } from "@/components/ui/GoogleMark";
import { reviewLinks, type GoogleReview, type ReviewsPayload } from "@/lib/reviews";
import { gsap, registerGsap, useIsoLayoutEffect, prefersReducedMotion } from "@/lib/gsap";

/* ----------------------------------------------------------------- card --- */

function ReviewCard({ review, index }: { review: GoogleReview; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > 240;
  const text = expanded || !long ? review.text : `${review.text.slice(0, 240).trimEnd()}…`;

  return (
    <article
      data-review-card
      className={`glass frame-soft flex w-[min(22rem,82vw)] shrink-0 snap-start flex-col p-6 sm:p-7 ${
        index % 2 === 1 ? "lg:mt-8" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {review.authorPhoto ? (
          // Google-hosted avatar; a plain img avoids a remote-pattern round trip.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.authorPhoto}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-taupe"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne font-display text-[1rem] text-graphite"
          >
            {review.author.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-medium text-graphite">
            {review.author}
          </p>
          <p className="text-[0.75rem] text-graphite-faint">{review.relativeTime}</p>
        </div>
        <GoogleMark className="ml-auto h-4 w-4 shrink-0" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Stars rating={review.rating} size={13} />
        <span className="sr-only">{review.rating} out of 5 stars</span>
      </div>

      <p className="mt-4 flex-1 text-[0.9375rem] leading-[1.7] text-graphite-soft">
        {text}
      </p>

      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 min-h-[44px] cursor-pointer self-start text-[0.8125rem] tracking-[0.1em] text-copper transition-opacity duration-300 hover:opacity-70"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </article>
  );
}

/* -------------------------------------------------------------- section --- */

export default function Reviews({ payload }: { payload: ReviewsPayload }) {
  const rail = useRef<HTMLDivElement>(null);
  const links = reviewLinks(payload);
  const hasReviews = payload.reviews.length > 0;

  /* Cards deal themselves in one at a time as the rail enters. */
  useIsoLayoutEffect(() => {
    registerGsap();
    const el = rail.current;
    if (!el || !hasReviews || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-review-card]"),
        { opacity: 0, y: 60, rotate: 2.5, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 1.05,
          stagger: 0.12,
          ease: "silk",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [hasReviews]);

  const scrollRail = (dir: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.75), behavior: "smooth" });
  };

  return (
    <>
      <Divider shape="arc" from="var(--color-cream)" to="var(--color-ivory)" />

      <section id="reviews" className="relative isolate overflow-hidden bg-ivory pb-[clamp(4rem,8vw,7rem)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[26rem]"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, rgba(239,224,203,0.7), transparent 70%)",
          }}
        />

        <div className="shell relative">
          {/* ---------------------------------------------------- rating --- */}
          <div className="grid gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
            <div>
              <Reveal variant="rise">
                <p className="eyebrow">Reviews</p>
              </Reveal>

              {payload.rating ? (
                <Reveal variant="bloom" delay={0.05}>
                  <div className="mt-6 flex items-end gap-5">
                    <span className="font-display text-[clamp(4rem,11vw,8rem)] leading-[0.82] text-graphite text-sheen">
                      {payload.rating.toFixed(1)}
                    </span>
                    <div className="pb-2">
                      <Stars rating={payload.rating} size={20} />
                      <p className="mt-2 flex items-center gap-2 text-[0.875rem] text-graphite-soft">
                        <GoogleMark className="h-4 w-4" />
                        {payload.total
                          ? `${payload.total.toLocaleString()} Google reviews`
                          : "on Google"}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ) : (
                <SplitLines
                  as="h2"
                  mode="words"
                  className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
                >
                  Rated by the people in the chair
                </SplitLines>
              )}
            </div>

            <Reveal variant="slide-right" className="lg:pb-3">
              <p className="max-w-[32rem] text-[length:var(--text-lede)] leading-[1.7] text-graphite-soft">
                Every review below is pulled live from Google — nothing is
                selected, edited or written here.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  href={links.read}
                  variant="glass"
                  size="lg"
                  icon={<GoogleMark className="h-4 w-4" />}
                >
                  Read all reviews
                </Button>
                <Button href={links.write} variant="outline" size="lg">
                  Leave a review
                </Button>
              </div>
            </Reveal>
          </div>

          {/* ------------------------------------------------------ rail --- */}
          {hasReviews ? (
            <>
              <div
                ref={rail}
                className="no-scrollbar mask-fade-x -mx-[var(--spacing-gutter)] mt-[clamp(2.5rem,5vw,4rem)] flex snap-x snap-mandatory gap-[clamp(1rem,2vw,1.75rem)] overflow-x-auto px-[var(--spacing-gutter)] pb-6 pt-4"
              >
                {payload.reviews.map((review, i) => (
                  <ReviewCard key={`${review.author}-${i}`} review={review} index={i} />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRail(-1)}
                  aria-label="Previous reviews"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-taupe text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
                >
                  <span aria-hidden>←</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(1)}
                  aria-label="More reviews"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-taupe text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
                >
                  <span aria-hidden>→</span>
                </button>
                <span className="ml-3 text-[0.75rem] tracking-[0.16em] text-graphite-faint">
                  SCROLL OR DRAG
                </span>
              </div>
            </>
          ) : (
            /* Honest empty state — no invented testimonials, ever. */
            <Reveal variant="bloom" className="mt-[clamp(2.5rem,5vw,4rem)]">
              <div className="glass frame-soft grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)]">
                <div className="flex flex-col items-start gap-5">
                  <GoogleMark className="h-7 w-7" />
                  <p className="max-w-[36rem] font-display text-[clamp(1.25rem,2.4vw,1.75rem)] leading-snug text-graphite">
                    The salon&apos;s reviews live on its Google profile.
                  </p>
                  <p className="max-w-[36rem] text-[0.9375rem] leading-[1.7] text-graphite-soft">
                    {payload.configured
                      ? "They could not be loaded just now — the buttons above go straight to the profile."
                      : "Connect the Google Places API and they will appear here automatically. Until then, this space stays empty rather than filled with placeholder quotes."}
                  </p>
                  <Button href={links.read} variant="outline" size="lg">
                    Read them on Google
                  </Button>
                </div>

                <Art
                  slot="hero-detail"
                  frame="pebble"
                  sizes="20vw"
                  hoverZoom={false}
                  decorative
                  className="hidden w-full max-w-[16rem] justify-self-end lg:block"
                />
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
