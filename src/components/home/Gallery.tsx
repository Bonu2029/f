"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BeforeAfter } from "@/components/home/BeforeAfter";
import { ArrowLeft, ArrowRight, Close } from "@/components/ui/Icons";
import { EASE_EDITORIAL, useSafeReducedMotion } from "@/components/ui/motion";
import { gallery, galleryCategories, type GalleryCategory } from "@/lib/data";

/**
 * Tiles claim different numbers of grid cells so the wall reads as a
 * composition rather than a row of equal boxes. Heights come from the grid's
 * auto-rows, never from an aspect ratio, so spans can never overflow.
 */
const SPAN_CLASS: Record<string, string> = {
  feature: "col-span-2 row-span-2",
  tall: "col-span-1 row-span-2",
  wide: "col-span-2 row-span-1",
  square: "col-span-1 row-span-1",
};

export function Gallery() {
  const reduced = useSafeReducedMotion();
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = useMemo(
    () => (filter === "all" ? gallery : gallery.filter((g) => g.category === filter)),
    [filter],
  );

  const active = lightbox === null ? null : items[lightbox] ?? null;

  const step = useCallback(
    (delta: number) =>
      setLightbox((current) =>
        current === null ? null : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, step]);

  return (
    <section id="gallery" className="relative overflow-hidden bg-navy-900 py-24 text-ivory-100 sm:py-32">
      <div className="grain grain-light absolute inset-0 opacity-35" />

      <div className="shell relative">
        <SectionHeading
          eyebrow="The Work"
          tone="light"
          lines={["Cuts that grow", "out properly."]}
          intro="Photographed in the shop, on the day, with no retouching. Two of these have a before you can drag through."
        />

        {/* Filters */}
        <div className="mt-10 flex flex-wrap gap-2.5">
          {galleryCategories.map((category) => {
            const selected = filter === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setFilter(category.id);
                  setLightbox(null);
                }}
                aria-pressed={selected}
                className={`relative cursor-pointer rounded-full border px-5 py-2.5 font-sans text-[0.625rem]
                            tracking-[0.18em] uppercase transition-all duration-400
                            ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              selected
                                ? "border-copper-500 bg-copper-500 text-ivory-50"
                                : "border-ivory-100/20 text-ivory-100/70 hover:border-copper-400/60 hover:text-ivory-100"
                            }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Masonry composition */}
        <motion.div
          layout={!reduced}
          className="mt-10 grid grid-cols-2 auto-rows-[9rem] gap-3 [grid-auto-flow:dense]
                     sm:auto-rows-[11rem] sm:grid-cols-4 sm:gap-4 lg:auto-rows-[13rem]"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.5, delay: reduced ? 0 : i * 0.04, ease: EASE_EDITORIAL }}
                onClick={() => setLightbox(i)}
                data-cursor-label="View"
                aria-label={`Open ${item.title}`}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-navy-800 ${
                  SPAN_CLASS[item.span] ?? ""
                }`}
              >
                <Image
                  src={item.image.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 25vw"
                  placeholder="blur"
                  blurDataURL={item.image.blurDataURL}
                  className={`object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07] ${
                    item.focal === "center" ? "object-center" : "object-top"
                  }`}
                />

                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(8,17,29,0.85)_100%)]
                             opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                />

                <span className="absolute inset-x-0 bottom-0 p-4 text-left">
                  <span className="block translate-y-1 font-display text-[0.9375rem] leading-tight text-ivory-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0">
                    {item.title}
                  </span>
                  {item.compare && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 font-sans text-[0.5rem] tracking-[0.18em] text-copper-300 uppercase">
                      Before / After
                    </span>
                  )}
                </span>

                <span
                  aria-hidden
                  className="hairline-frame pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[115] flex items-center justify-center bg-navy-950/96 p-4 backdrop-blur-md sm:p-8"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close gallery"
              className="absolute top-5 right-5 z-10 flex h-11 w-11 cursor-pointer items-center justify-center
                         rounded-full border border-ivory-100/25 text-ivory-100 transition-colors hover:border-copper-400 hover:text-copper-300"
            >
              <Close className="h-4 w-4" />
            </button>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Previous photograph"
                  className="absolute left-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center
                             rounded-full border border-ivory-100/25 text-ivory-100 transition-colors
                             hover:border-copper-400 hover:text-copper-300 sm:left-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Next photograph"
                  className="absolute right-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center
                             rounded-full border border-ivory-100/25 text-ivory-100 transition-colors
                             hover:border-copper-400 hover:text-copper-300 sm:right-6"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl"
            >
              {active.compare ? (
                <div className="rounded-3xl bg-ivory-100 p-4 sm:p-6">
                  <BeforeAfter
                    before={active.compare.before}
                    after={active.compare.after}
                    beforeAlt={active.compare.beforeAlt}
                    afterAlt={active.compare.afterAlt}
                  />
                  <div className="mt-5">
                    <h3 className="font-display text-xl text-navy-900">{active.title}</h3>
                    <p className="mt-1.5 text-sm text-navy-800/65">{active.caption}</p>
                  </div>
                </div>
              ) : (
                <figure>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-navy-900">
                    <Image
                      src={active.image.src}
                      alt={active.alt}
                      fill
                      sizes="(max-width: 1024px) 92vw, 60vw"
                      placeholder="blur"
                      blurDataURL={active.image.blurDataURL}
                      className="object-cover object-top"
                    />
                  </div>
                  <figcaption className="mt-5">
                    <h3 className="font-display text-xl text-ivory-100">{active.title}</h3>
                    <p className="mt-1.5 text-sm text-steel-200">{active.caption}</p>
                  </figcaption>
                </figure>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
