import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={cn(narrow ? 'container-narrow' : 'container-luma', className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
  tone = 'plain',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'plain' | 'pearl' | 'gradient' | 'mint' | 'white';
  as?: ElementType;
}) {
  const tones = {
    plain: '',
    white: 'bg-white',
    pearl: 'bg-pearl/70',
    mint: 'bg-mint/30',
    gradient: 'bg-luma-gradient',
  } as const;

  return (
    <Tag id={id} className={cn('py-16 sm:py-24', tones[tone], className)}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
  level = 2,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = (level === 2 ? 'h2' : 'h3') as ElementType;
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <Heading className="text-balance text-3xl leading-[1.15] sm:text-4xl md:text-[2.75rem]">
        {title}
      </Heading>
      {lede ? <p className="lede mt-5 text-pretty">{lede}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'mint',
  className,
}: {
  children: ReactNode;
  tone?: 'mint' | 'airy' | 'champagne' | 'lavender' | 'outline';
  className?: string;
}) {
  const tones = {
    mint: 'bg-mint/70 text-ink',
    airy: 'bg-airy/70 text-ink',
    champagne: 'bg-champagne/70 text-ink',
    lavender: 'bg-lavender/70 text-ink',
    outline: 'border border-line bg-white text-muted',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={cn('surface p-6 sm:p-8', className)}>{children}</Tag>
  );
}

export function Note({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-pearl/70 p-5 text-sm leading-relaxed text-muted',
        className,
      )}
    >
      {title ? (
        <p className="mb-1 font-semibold text-ink">{title}</p>
      ) : null}
      {children}
    </div>
  );
}

export function PlaceholderTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-champagne bg-champagne/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 3v2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="5" cy="7.2" r="0.6" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}

export function CheckList({
  items,
  className,
  tone = 'accent',
}: {
  items: string[];
  className?: string;
  tone?: 'accent' | 'muted';
}) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
          <span
            className={cn(
              'mt-1 flex h-4 w-4 flex-none items-center justify-center rounded-full',
              tone === 'accent' ? 'bg-mint' : 'bg-pearl',
            )}
            aria-hidden="true"
          >
            <svg width="10" height="8" viewBox="0 0 10 8">
              <path
                d="M1 4.2 3.4 6.6 9 1"
                fill="none"
                stroke="#39443F"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-ink/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExcludeList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
          <span
            className="mt-1 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-champagne/70"
            aria-hidden="true"
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path
                d="M1 4h6"
                fill="none"
                stroke="#39443F"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-muted">{item}</span>
        </li>
      ))}
    </ul>
  );
}
