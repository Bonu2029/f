'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import type { ReactNode } from 'react';

/**
 * App Router templates remount on navigation, which gives every route a short,
 * consistent entrance without holding up the content behind a loading screen.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
