"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Art from "@/components/ui/Art";
import Reveal from "@/components/motion/Reveal";
import SplitLines from "@/components/motion/SplitLines";
import Lightbox, { type LightboxItem } from "@/components/ui/Lightbox";
import Divider from "@/components/decor/Divider";
import { gallery, galleryFilters, type GalleryCategory } from "@/lib/content";

/** Rounded frames rotate through the grid so no two neighbours match. */
const FRAMES = ["soft", "arch", "pebble", "soft", "leaf", "soft"] as const;

export default function Gallery() {
  const [filter, setFilter] = useState<GalleryCategory>("all");
  const [open, setOpen] = useState<number | null>(null);

  const visible = useMemo(
    () =>
      filter === "all"
        ? gallery
        : gallery.filter((g) => g.categories.includes(filter)),
    [filter],
  );

  const items: LightboxItem[] = visible.map((g) => ({
    slot: g.image,
    caption: g.caption,
  }));

  return (
    <>
      <Divider shape="wave" from="var(--color-ivory)" to="var(--color-cream)" />

      <section id="gallery" className="relative isolate overflow-hidden py-[clamp(2rem,5vw,4rem)]">
        <div className="shell relative">
          {/* ------------------------------------------------------ head --- */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[36rem]">
              <Reveal variant="rise">
                <p className="eyebrow">Gallery</p>
              </Reveal>
              <SplitLines
                as="h2"
                mode="words"
                className="mt-6 font-display text-[length:var(--text-display)] leading-[0.95] text-graphite"
              >
                A quiet record of good hair days
              </SplitLines>
            </div>

            {/* Filters — pill rail, horizontally scrollable on mobile */}
            <Reveal variant="slide-right">
              <div
                role="tablist"
                aria-label="Filter gallery"
                className="no-scrollbar -mx-[var(--spacing-gutter)] flex gap-2 overflow-x-auto px-[var(--spacing-gutter)] lg:mx-0 lg:px-0"
              >
                {galleryFilters.map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(f.id)}
                      className={`relative min-h-[44px] shrink-0 cursor-pointer rounded-full px-5 text-[0.8125rem] tracking-[0.06em] transition-colors duration-300 ${
                        active ? "text-cream" : "text-graphite-soft hover:text-graphite"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="gallery-pill"
                          className="absolute inset-0 rounded-full bg-graphite"
                          transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </Reveal>
          </div>

          {/* --------------------------------------------------- masonry --- */}
          <motion.div
            layout
            className="mt-[clamp(2.5rem,5vw,4rem)] columns-2 gap-[clamp(0.75rem,1.6vw,1.5rem)] md:columns-3 xl:columns-4"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((item, i) => (
                <motion.button
                  key={item.image}
                  layout
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`Open ${item.caption}`}
                  initial={{ opacity: 0, y: 34, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
                  transition={{
                    duration: 0.6,
                    delay: (i % 6) * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`group relative mb-[clamp(0.75rem,1.6vw,1.5rem)] block w-full cursor-pointer break-inside-avoid text-left ${
                    item.feature ? "xl:mb-[clamp(1.25rem,2.4vw,2.25rem)]" : ""
                  }`}
                >
                  <Art
                    slot={item.image}
                    frame={FRAMES[i % FRAMES.length]}
                    sizes="(max-width: 768px) 46vw, (max-width: 1280px) 30vw, 22vw"
                    className="shadow-[0_28px_70px_-38px_rgba(33,30,27,0.4)] transition-shadow duration-700 group-hover:shadow-[0_40px_90px_-38px_rgba(33,30,27,0.5)]"
                  />

                  {/* Caption veil rises on hover / is always readable on touch */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between gap-3 rounded-b-[inherit] bg-[linear-gradient(to_top,rgba(33,30,27,0.62),transparent)] p-4 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    <span className="text-[0.8125rem] leading-snug text-cream">
                      {item.caption}
                    </span>
                    <span aria-hidden className="shrink-0 text-cream/80">
                      ↗
                    </span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>

          <Reveal variant="rise">
            <p className="mt-10 text-[0.8125rem] tracking-[0.06em] text-graphite-faint">
              {visible.length} of {gallery.length} shown
            </p>
          </Reveal>
        </div>
      </section>

      <Lightbox
        items={items}
        index={open}
        onClose={() => setOpen(null)}
        onIndexChange={setOpen}
      />
    </>
  );
}
