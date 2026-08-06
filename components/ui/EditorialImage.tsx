import Image from 'next/image';
import { getImage, type ImageTone } from '@/lib/content/images';
import { cn } from '@/lib/utils';

const toneStyles: Record<ImageTone, string> = {
  mint: 'from-mint via-ivory to-airy/60',
  airy: 'from-airy via-white to-mint/50',
  champagne: 'from-champagne/80 via-ivory to-pearl',
  lavender: 'from-lavender/80 via-white to-airy/50',
  pearl: 'from-pearl via-white to-champagne/50',
};

/**
 * Renders the final photograph when a slot has a `src`, and a considered
 * placeholder — with the art-direction label — when it does not. The alt text
 * is defined alongside the prompt so it ships with the real asset.
 */
export function EditorialImage({
  id,
  className,
  aspect = 'aspect-[4/3]',
  priority = false,
  rounded = 'rounded-3xl',
  showLabel = true,
}: {
  id: string;
  className?: string;
  aspect?: string;
  priority?: boolean;
  rounded?: string;
  showLabel?: boolean;
}) {
  const slot = getImage(id);

  if (!slot) {
    return null;
  }

  if (slot.src) {
    return (
      <div className={cn('relative overflow-hidden', rounded, aspect, className)}>
        <Image
          src={slot.src}
          alt={slot.alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={slot.alt}
      className={cn(
        'relative overflow-hidden border border-line bg-gradient-to-br',
        toneStyles[slot.tone],
        rounded,
        aspect,
        className,
      )}
    >
      <div className="absolute inset-0 grain opacity-70" aria-hidden="true" />
      <div
        className="absolute -left-1/3 top-0 h-full w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/55 to-transparent"
        aria-hidden="true"
      />
      <svg
        className="absolute inset-0 h-full w-full text-ink/10"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 210 C 90 170 150 250 400 190" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M0 240 C 120 210 200 270 400 225" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="250" y="40" width="110" height="130" fill="none" stroke="currentColor" strokeWidth="1" rx="4" />
        <path d="M305 40v130M250 105h110" stroke="currentColor" strokeWidth="1" />
      </svg>
      {showLabel ? (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-muted backdrop-blur-sm">
            Image placeholder · {slot.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
