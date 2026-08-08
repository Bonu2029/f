'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { primaryNav, site } from '@/lib/site';
import { lookupZip } from '@/lib/content/locations';

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [zip, setZip] = useState('');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const checkZip = () => {
    const outcome = lookupZip(zip);
    if (outcome.status === 'invalid') setResult('Enter a five-digit ZIP code.');
    else if (outcome.status === 'unknown')
      setResult('Not on our confirmed list yet — you can join the area waitlist.');
    else setResult(`${outcome.area.city} — ${outcome.area.zone} service area.`);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          id="mobile-nav"
          className="fixed inset-0 z-[70] overflow-y-auto bg-ivory lg:hidden"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          ref={panelRef}
          tabIndex={-1}
        >
          <div className="min-h-full bg-luma-veil pb-16">
            <div className="container-luma">
              <div className="flex h-[76px] items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink"
                >
                  <span className="sr-only">Close menu</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M2 2l12 12M14 2L2 14"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <nav aria-label="Mobile" className="mt-6">
                <ul className="space-y-1">
                  {primaryNav.map((item, index) => (
                    <motion.li
                      key={item.label}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * index, duration: 0.35 }}
                    >
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center justify-between border-b border-line/70 py-4 font-display text-2xl text-ink"
                      >
                        {item.label}
                        <Icon name="arrow" size={18} className="text-accent" />
                      </Link>
                      {item.columns ? (
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 py-3">
                          {item.columns
                            .flatMap((column) => column.items)
                            .map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onClose}
                                  className="block py-1 text-sm text-muted"
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      ) : null}
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="mt-8 grid gap-3">
                <Button href="/booking" size="lg" onClick={onClose}>
                  Book Now
                </Button>
                <Button
                  href="/customer-dashboard"
                  variant="secondary"
                  size="lg"
                  onClick={onClose}
                >
                  Customer Login
                </Button>
                <a
                  href={site.phoneHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/70 px-6 py-4 text-[15px] text-ink"
                >
                  <Icon name="chat" size={18} className="text-accent" />
                  Call {site.phone}
                  <span className="text-xs text-muted">(placeholder)</span>
                </a>
              </div>

              <div className="mt-8 rounded-3xl border border-line bg-white p-5">
                <label
                  htmlFor="mobile-zip"
                  className="block text-sm font-medium text-ink"
                >
                  Check your service area
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    id="mobile-zip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    placeholder="ZIP code"
                    className="w-full rounded-full border border-line bg-pearl/50 px-4 py-3 text-[15px] outline-none focus:border-accent"
                  />
                  <Button onClick={checkZip} size="sm">
                    Check
                  </Button>
                </div>
                {result ? (
                  <p className="mt-3 text-sm text-muted" role="status">
                    {result}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
