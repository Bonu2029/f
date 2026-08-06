'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { primaryNav, site } from '@/lib/site';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:shadow-lift"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-luma',
          scrolled
            ? 'border-b border-line/80 bg-ivory/88 backdrop-blur-md shadow-soft'
            : 'border-b border-transparent bg-ivory/45 backdrop-blur-sm',
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="container-luma">
          <div className="flex h-[76px] items-center justify-between gap-4">
            <Logo />

            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 lg:flex"
            >
              {primaryNav.map((item) => {
                const hasMenu = Boolean(item.columns);
                const open = openMenu === item.label;
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => {
                      cancelClose();
                      if (hasMenu) setOpenMenu(item.label);
                      else setOpenMenu(null);
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-expanded={hasMenu ? open : undefined}
                      aria-haspopup={hasMenu ? 'true' : undefined}
                      onFocus={() => (hasMenu ? setOpenMenu(item.label) : setOpenMenu(null))}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] transition-colors',
                        isActive(item.href)
                          ? 'text-accent-deep'
                          : 'text-ink/85 hover:text-accent-deep',
                      )}
                    >
                      {item.label}
                      {hasMenu ? (
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={cn(
                            'transition-transform duration-300',
                            open && 'rotate-180',
                          )}
                        >
                          <path
                            d="M1 1l4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : null}
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/customer-dashboard"
                className="hidden rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-accent-deep md:inline-flex"
              >
                Customer Login
              </Link>
              {/* Booking stays reachable at every width — most customers book from a phone. */}
              <Button href="/booking" size="sm">
                Book Now
              </Button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/70 text-ink lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                onClick={() => setMobileOpen(true)}
              >
                <span className="sr-only">Open menu</span>
                <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
                  <path
                    d="M0 1h20M0 7h20M0 13h13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {openMenu ? (
            <motion.div
              key={openMenu}
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-[76px] hidden lg:block"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="container-luma pb-6">
                <MegaMenu label={openMenu} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

function MegaMenu({ label }: { label: string }) {
  const item = primaryNav.find((nav) => nav.label === label);
  if (!item?.columns) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
      <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
        {item.columns.map((column) => (
          <div key={column.title}>
            <p className="eyebrow mb-4">{column.title}</p>
            <ul className="space-y-1">
              {column.items.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className="group block rounded-2xl px-3 py-2.5 transition-colors hover:bg-mint/30"
                  >
                    <span className="flex items-center gap-2 text-[15px] font-medium text-ink">
                      {child.label}
                      <span className="translate-x-0 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                        <Icon name="arrow" size={14} />
                      </span>
                    </span>
                    {child.description ? (
                      <span className="mt-0.5 block text-sm text-muted">
                        {child.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {item.featured ? (
          <div className="rounded-2xl bg-luma-gradient p-6">
            <p className="font-display text-xl leading-snug text-ink">
              {item.featured.title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {item.featured.body}
            </p>
            <Button href={item.featured.href} size="sm" className="mt-5">
              {item.featured.cta}
            </Button>
            <p className="mt-5 text-xs text-muted">
              Questions? <a className="link-underline" href={site.phoneHref}>{site.phone}</a>
              <span className="ml-1 text-[11px]">(placeholder)</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
