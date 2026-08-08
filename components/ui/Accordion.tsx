'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type AccordionItem = { q: string; a: string; category?: string };

export function Accordion({
  items,
  className,
  defaultOpen = -1,
}: {
  items: AccordionItem[];
  className?: string;
  defaultOpen?: number;
}) {
  const [open, setOpen] = useState<number>(defaultOpen);
  const reduce = useReducedMotion();

  return (
    <div className={cn('divide-y divide-line rounded-3xl border border-line bg-white', className)}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="flex w-full items-start justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-pearl/50 sm:px-7"
              >
                <span className="text-[16px] font-medium text-ink sm:text-[17px]">
                  {item.q}
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border transition-all duration-300',
                    isOpen ? 'rotate-45 border-accent bg-accent text-white' : 'border-line text-accent',
                  )}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-6 text-[15px] leading-relaxed text-muted sm:px-7">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
