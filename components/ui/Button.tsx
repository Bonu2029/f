import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 ease-luma disabled:cursor-not-allowed disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-soft hover:bg-accent-deep hover:shadow-lift hover:-translate-y-[1px] active:translate-y-0',
  secondary:
    'border border-accent/35 bg-white text-ink hover:border-accent hover:bg-mint/35 hover:-translate-y-[1px] active:translate-y-0',
  ghost:
    'border border-line bg-transparent text-ink hover:border-sage hover:bg-white/70',
  quiet: 'text-accent hover:text-accent-deep underline-offset-4 hover:underline',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = CommonProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className' | 'children'>;

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & {
    href?: undefined;
  };

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const classes = cn(
    base,
    variants[variant],
    variant === 'quiet' ? '' : sizes[size],
    className,
  );

  if ('href' in props && props.href) {
    const { href, ...linkRest } = rest as { href: string };
    return (
      <Link href={href} className={classes} {...(linkRest as object)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<'button'>)}>
      {children}
    </button>
  );
}
