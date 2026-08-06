'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { PlaceholderTag } from './Primitives';
import { testimonials } from '@/lib/content/general';

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const item = testimonials[index];

  const go = (direction: 1 | -1) =>
    setIndex((current) => (current + direction + testimonials.length) % testimonials.length);

  return (
    <div className="relative">
      <div className="rounded-3xl border border-line bg-white p-8 shadow-soft sm:p-12">
        <PlaceholderTag>Sample review — awaiting real customer feedback</PlaceholderTag>
        <div className="mt-6 min-h-[190px] sm:min-h-[170px]">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={index}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-display text-2xl leading-snug text-ink sm:text-[28px]">
                “{item.quote}”
              </p>
              <footer className="mt-5 text-sm text-muted">{item.context}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <div className="flex gap-2" role="tablist" aria-label="Choose a review">
            {testimonials.map((testimonial, i) => (
              <button
                key={testimonial.context}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Review ${i + 1} of ${testimonials.length}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-8 bg-accent' : 'w-2 bg-line hover:bg-sage'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <CarouselButton direction="previous" onClick={() => go(-1)} />
            <CarouselButton direction="next" onClick={() => go(1)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselButton({
  direction,
  onClick,
}: {
  direction: 'previous' | 'next';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-accent transition-colors hover:border-accent hover:bg-mint/30"
    >
      <span className="sr-only">{direction === 'next' ? 'Next review' : 'Previous review'}</span>
      <svg
        width="16"
        height="12"
        viewBox="0 0 16 12"
        aria-hidden="true"
        className={direction === 'previous' ? 'rotate-180' : ''}
      >
        <path
          d="M1 6h14M10 1l5 5-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
