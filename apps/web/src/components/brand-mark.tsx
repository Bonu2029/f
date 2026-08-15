import Link from 'next/link';
import { brand } from '@afd/shared';
import { cn } from '@/lib/cn';

/**
 * The wordmark. Reads its name, colours and logo from the central brand config,
 * so rebranding never requires touching a component.
 */
export function BrandMark({
  href = '/',
  className,
  size = 'md',
  showName = true,
}: {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md';
  showName?: boolean;
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className={cn(
          'grid place-items-center rounded-lg bg-brand-600 font-bold text-white',
          size === 'sm' ? 'size-6 text-[10px]' : 'size-7 text-[11px]',
        )}
      >
        {brand.logoMark}
      </span>
      {showName && (
        <span className={cn('font-semibold tracking-tight text-ink', size === 'sm' ? 'text-sm' : 'text-[15px]')}>
          {brand.name}
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="rounded-lg" aria-label={`${brand.name} home`}>
      {content}
    </Link>
  );
}
