'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { journeySteps } from '@/lib/content/general';

/** Vertical timeline whose progress line fills as the section scrolls past. */
export function JourneyTimeline() {
  const container = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start 70%', 'end 60%'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <ol ref={container} className="relative ml-1 space-y-12 sm:space-y-16">
      <div className="absolute left-[19px] top-2 h-[calc(100%-1rem)] w-px bg-line" aria-hidden="true" />
      {!reduce ? (
        <motion.div
          className="absolute left-[19px] top-2 w-px origin-top bg-accent"
          style={{ height: 'calc(100% - 1rem)', scaleY: progress }}
          aria-hidden="true"
        />
      ) : null}

      {journeySteps.map((step, index) => (
        <motion.li
          key={step.title}
          className="relative pl-14"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white font-display text-sm text-accent shadow-soft">
            {index + 1}
          </span>
          <h3 className="text-xl sm:text-2xl">{step.title}</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{step.body}</p>
          <p className="mt-3 inline-flex rounded-full bg-mint/35 px-3.5 py-1.5 text-sm text-ink/80">
            {step.detail}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
