"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Art from "@/components/ui/Art";

export type LightboxItem = { slot: string; caption: string; meta?: string };

/**
 * Fullscreen viewer. Framer Motion handles the enter/exit (it survives the
 * unmount, which GSAP would need extra bookkeeping for), and focus is moved
 * into the dialog and restored on close.
 */
export default function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const open = index !== null;
  const dialog = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    window.dispatchEvent(new Event("massiel:lock-scroll"));
    document.body.style.overflow = "hidden";
    dialog.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.dispatchEvent(new Event("massiel:unlock-scroll"));
      document.body.style.overflow = "";
      restoreTo.current?.focus?.();
    };
  }, [open, onClose, step]);

  const current = index === null ? null : items[index];

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[9500] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            aria-label="Close viewer"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-cream/88 backdrop-blur-2xl"
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(24px)" }}
          />

          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={current.caption}
            tabIndex={-1}
            className="relative flex max-h-full w-full max-w-5xl flex-col items-center outline-none"
          >
            <motion.div
              key={current.slot}
              className="relative w-full max-w-[min(100%,46rem)]"
              initial={{ opacity: 0, scale: 0.94, y: 24, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Art
                slot={current.slot}
                frame="soft"
                hoverZoom={false}
                sizes="(max-width: 768px) 92vw, 46rem"
                className="shadow-[0_60px_140px_-50px_rgba(33,30,27,0.5)]"
              />
            </motion.div>

            <motion.div
              className="mt-6 flex w-full items-center justify-between gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5 }}
            >
              <div className="min-w-0">
                <p className="truncate font-display text-[1.125rem] text-graphite">
                  {current.caption}
                </p>
                {current.meta && (
                  <p className="mt-1 text-[0.8125rem] text-graphite-faint">{current.meta}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="mr-2 font-sans text-[0.6875rem] tracking-[0.3em] text-graphite-faint">
                  {String((index ?? 0) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-taupe bg-ivory/70 text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
                >
                  <span aria-hidden>←</span>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-taupe bg-ivory/70 text-graphite transition-colors duration-300 hover:border-copper hover:text-copper"
                >
                  <span aria-hidden>→</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close viewer"
                  className="ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-graphite text-cream transition-transform duration-300 hover:scale-105"
                >
                  <span aria-hidden>✕</span>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
