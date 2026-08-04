"use client";

import Art from "@/components/ui/Art";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Parallax from "@/components/motion/Parallax";
import Divider from "@/components/decor/Divider";
import Blobs, { FIELD_LAVENDER } from "@/components/decor/Blobs";
import { studio } from "@/lib/content";
import { site } from "@/lib/site";

export default function Studio() {
  return (
    <>
      <Divider shape="swell" from="var(--color-cream)" to="var(--color-ivory)" />

      <section id="studio" className="relative isolate overflow-hidden bg-ivory pb-[clamp(4rem,9vw,8rem)] pt-[clamp(1rem,3vw,3rem)]">
        <Blobs blobs={FIELD_LAVENDER} />

        <div className="shell relative">
          <div className="grid gap-[clamp(3rem,6vw,6rem)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            {/* ---------------------------------------------------- art --- */}
            <div className="relative">
              <Parallax speed={-0.1}>
                <Reveal variant="unveil">
                  <Art
                    slot="studio-portrait"
                    frame="petal"
                    sizes="(max-width: 1024px) 88vw, 42vw"
                    className="mx-auto w-full max-w-[30rem] shadow-[0_50px_120px_-52px_rgba(33,30,27,0.4)]"
                  />
                </Reveal>
              </Parallax>

              {/* Overlapping detail, offset off the portrait's edge */}
              <Parallax
                speed={0.16}
                className="absolute -bottom-10 -right-3 w-[42%] max-w-[12.5rem] sm:-right-8"
              >
                <Reveal variant="bloom" delay={0.15}>
                  <Art
                    slot="studio-detail"
                    frame="pebble"
                    sizes="20vw"
                    className="shadow-[0_30px_70px_-30px_rgba(33,30,27,0.45)] ring-4 ring-ivory"
                  />
                </Reveal>
              </Parallax>

              {/* Hand-drawn arc */}
              <svg
                aria-hidden
                viewBox="0 0 200 200"
                className="pointer-events-none absolute -left-10 -top-10 hidden h-32 w-32 text-copper/30 lg:block"
                fill="none"
              >
                <path
                  d="M8 192 C 8 90, 90 8, 192 8"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* --------------------------------------------------- copy --- */}
            <div className="lg:pt-[clamp(1rem,5vw,5rem)]">
              <Reveal variant="rise">
                <p className="eyebrow">{studio.eyebrow}</p>
              </Reveal>

              <SplitLines
                as="h2"
                mode="words"
                className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
              >
                {studio.headline}
              </SplitLines>

              <Reveal variant="mask-wipe" delay={0.1}>
                <p className="mt-7 max-w-[36rem] text-[length:var(--text-lede)] leading-[1.7] text-graphite-soft">
                  {studio.lede}
                </p>
              </Reveal>

              <Reveal variant="stagger-children" className="mt-6 space-y-4" delay={0.05}>
                {studio.paragraphs.map((p) => (
                  <p key={p} className="max-w-[36rem] text-[1rem] leading-[1.75] text-graphite-soft">
                    {p}
                  </p>
                ))}
              </Reveal>

              {/* Values — offset cards, not a row of identical boxes */}
              <Reveal
                variant="stagger-children"
                as="ul"
                className="mt-12 space-y-4"
                delay={0.05}
              >
                {studio.values.map((value, i) => (
                  <li
                    key={value.title}
                    className={`glass frame-soft group flex gap-5 p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 sm:p-6 ${
                      i === 1 ? "sm:ml-8" : i === 2 ? "sm:ml-4" : ""
                    }`}
                  >
                    <span className="mt-1 font-sans text-[0.625rem] tracking-[0.3em] text-copper">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-[1.25rem] leading-tight text-graphite">
                        {value.title}
                      </h3>
                      <p className="mt-2 text-[0.9375rem] leading-[1.65] text-graphite-soft">
                        {value.body}
                      </p>
                    </div>
                  </li>
                ))}
              </Reveal>
            </div>
          </div>

          {/* Wide studio shot, bled across the grid */}
          <Reveal variant="mask-wipe" className="mt-[clamp(3rem,7vw,6rem)]">
            <Parallax speed={-0.05} zoom={0.03}>
              <Art
                slot="studio-interior"
                frame="soft"
                sizes="94vw"
                aspect="21 / 9"
                className="shadow-[0_50px_130px_-55px_rgba(33,30,27,0.4)]"
              />
            </Parallax>
          </Reveal>

          <Reveal variant="rise" delay={0.1}>
            <p className="mt-6 max-w-[30rem] text-[0.8125rem] leading-relaxed tracking-[0.06em] text-graphite-faint">
              {site.legalName} · {site.address.locality}, {site.address.region}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
