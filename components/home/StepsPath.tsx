'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { howItWorksSteps } from '@/lib/content/general';

/** Four steps joined by a path that draws itself once as the section arrives. */
export function StepsPath() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-0 top-[54px] hidden w-full lg:block"
        height="60"
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.path
          d="M60 30 C 220 -12, 300 68, 400 30 S 620 -12, 720 30 S 900 66, 950 26"
          fill="none"
          stroke="#AFCDBF"
          strokeWidth="1.5"
          strokeDasharray="5 7"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {howItWorksSteps.map((step, index) => (
          <motion.li
            key={step.title}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white font-display text-xl text-accent shadow-soft">
              {index + 1}
            </span>
            <h3 className="mt-5 text-xl">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
