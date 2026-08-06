'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  total,
  label,
  className,
}: {
  value: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.round((value / total) * 100);
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label ?? 'Progress'}</span>
        <span className="text-muted">
          Step {value} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={`Step ${value} of ${total}${label ? `: ${label}` : ''}`}
        className="h-2 w-full overflow-hidden rounded-full bg-pearl"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sage to-accent"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-muted">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-sage"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.16 }}
          />
        ))}
      </span>
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon = 'home',
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-pearl/40 px-6 py-12 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent shadow-soft">
        <Icon name={icon} size={24} />
      </span>
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorMessage({
  title = 'Something needs another look',
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border border-champagne bg-champagne/25 p-4"
    >
      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-ink">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 2.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="6" cy="9" r="0.8" fill="currentColor" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

export function SuccessNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-sage bg-mint/30 p-4" role="status">
      <AnimatedCheck />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

export function AnimatedCheck({ size = 24 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-accent text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.55} height={size * 0.45} viewBox="0 0 12 9">
        <motion.path
          d="M1 4.6 4.4 8 11 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </span>
  );
}

export type ToastMessage = { id: number; title: string; body?: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const push = (title: string, body?: string) =>
    setToasts((current) => [...current, { id: Date.now() + Math.random(), title, body }]);
  const dismiss = (id: number) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));
  return { toasts, push, dismiss };
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4600);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift"
    >
      <AnimatedCheck size={22} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.body ? <p className="mt-0.5 text-sm text-muted">{toast.body}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-pearl"
      >
        <span className="sr-only">Dismiss notification</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
