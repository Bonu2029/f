"use client";

import { useState } from "react";
import BeforeAfter from "@/components/ui/BeforeAfter";
import Lightbox, { type LightboxItem } from "@/components/ui/Lightbox";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Parallax from "@/components/motion/Parallax";
import Divider from "@/components/decor/Divider";
import Blobs, { FIELD_SOFT } from "@/components/decor/Blobs";
import Art from "@/components/ui/Art";
import { transformations } from "@/lib/content";

export default function Transformations() {
  const [open, setOpen] = useState<number | null>(null);

  const [featured, ...rest] = transformations;

  const lightboxItems: LightboxItem[] = transformations.flatMap((t) => [
    { slot: t.before, caption: `${t.title} — before`, meta: t.service },
    { slot: t.after, caption: `${t.title} — after`, meta: t.service },
  ]);

  return (
    <>
      <Divider shape="petal" from="var(--color-ivory)" to="var(--color-cream)" />

      <section id="transformations" className="relative isolate overflow-hidden py-[clamp(3rem,6vw,5rem)]">
        <Blobs blobs={FIELD_SOFT} />

        <div className="shell relative">
          {/* ------------------------------------------------------ head --- */}
          <div className="max-w-[46rem]">
            <Reveal variant="bloom">
              <p className="eyebrow">Transformations</p>
            </Reveal>
            <SplitLines
              as="h2"
              mode="words"
              className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
            >
              Drag the line. Watch it change.
            </SplitLines>
            <Reveal variant="rise" delay={0.1}>
              <p className="mt-6 max-w-[34rem] text-[length:var(--text-lede)] leading-[1.7] text-graphite-soft">
                Same light, same angle, same day. The only thing different is the
                work.
              </p>
            </Reveal>
          </div>

          {/* -------------------------------------------------- featured --- */}
          <div className="mt-[clamp(2.5rem,5vw,4.5rem)] grid items-center gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-[27rem_minmax(0,1fr)]">
            <Reveal variant="unveil">
              <BeforeAfter
                before={featured.before}
                after={featured.after}
                label={featured.title}
                className="mx-auto w-full max-w-[27rem] [&>div]:shadow-[0_50px_120px_-50px_rgba(33,30,27,0.4)] lg:mx-0"
              />
            </Reveal>

            <Reveal variant="slide-right" className="lg:pl-4">
              <span className="eyebrow text-[0.5625rem]">Featured</span>
              <h3 className="mt-4 font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.05] text-graphite">
                {featured.title}
              </h3>
              <p className="mt-4 text-[0.9375rem] uppercase tracking-[0.18em] text-copper">
                {featured.service}
              </p>
              <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-[1.7] text-graphite-soft">
                {featured.note}
              </p>

              <button
                type="button"
                onClick={() => setOpen(0)}
                className="group mt-8 inline-flex min-h-[44px] cursor-pointer items-center gap-3 text-[0.8125rem] tracking-[0.14em] text-graphite transition-colors duration-300 hover:text-copper"
              >
                <span className="relative">
                  Open fullscreen
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-copper transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  ↗
                </span>
              </button>
            </Reveal>
          </div>

          {/* ---------------------------------------------------- masonry --- */}
          <div className="mt-[clamp(3rem,6vw,5.5rem)] grid gap-[clamp(1.5rem,3vw,3rem)] md:grid-cols-2">
            {rest.map((t, i) => (
              <Parallax key={t.id} speed={i === 0 ? -0.05 : 0.05} className={i === 1 ? "md:mt-16" : ""}>
                <Reveal variant={i === 0 ? "drape" : "bloom"} delay={i * 0.08}>
                  <div className="glass frame-soft p-3 sm:p-4">
                    <BeforeAfter
                      before={t.before}
                      after={t.after}
                      label={t.title}
                      initial={i === 0 ? 44 : 60}
                      className="mx-auto w-full max-w-[22rem]"
                    />
                    <div className="flex items-start justify-between gap-4 px-1 pb-1 pt-3">
                      <div>
                        <h3 className="font-display text-[1.375rem] leading-tight text-graphite">
                          {t.title}
                        </h3>
                        <p className="mt-1.5 text-[0.75rem] uppercase tracking-[0.18em] text-copper">
                          {t.service}
                        </p>
                        <p className="mt-3 max-w-[26rem] text-[0.9375rem] leading-[1.65] text-graphite-soft">
                          {t.note}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(transformations.indexOf(t) * 2 + 1)}
                        aria-label={`Open ${t.title} fullscreen`}
                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-taupe text-graphite transition-all duration-300 hover:border-copper hover:text-copper"
                      >
                        <span aria-hidden>↗</span>
                      </button>
                    </div>
                  </div>
                </Reveal>
              </Parallax>
            ))}
          </div>

          {/* Contact sheet — every frame, tap to enlarge */}
          <Reveal variant="stagger-children" className="mt-[clamp(3rem,6vw,5rem)] grid grid-cols-3 gap-3 sm:grid-cols-6">
            {lightboxItems.map((item, i) => (
              <button
                key={`${item.slot}-${i}`}
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Open ${item.caption}`}
                className="group relative cursor-pointer overflow-hidden frame-soft"
              >
                <Art
                  slot={item.slot}
                  frame="none"
                  sizes="(max-width: 640px) 30vw, 15vw"
                  aspect="1 / 1"
                  decorative
                />
                <span className="absolute inset-0 bg-graphite/0 transition-colors duration-500 group-hover:bg-graphite/10" />
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      <Lightbox
        items={lightboxItems}
        index={open}
        onClose={() => setOpen(null)}
        onIndexChange={setOpen}
      />
    </>
  );
}
