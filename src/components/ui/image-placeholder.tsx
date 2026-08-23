import { cn } from "@/lib/cn";

/**
 * A deliberately empty image slot.
 *
 * Real photography drops in here later; until then it renders as a clean
 * bordered surface so layouts read correctly without placeholder art.
 */
export function ImagePlaceholder({
  label,
  ratio = "16 / 10",
  className,
  rounded = "rounded-3xl",
}: {
  /** Short note describing the image that belongs here. */
  label?: string;
  /** Any valid CSS aspect-ratio value. */
  ratio?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      role="presentation"
      style={{ aspectRatio: ratio }}
      className={cn(
        "placeholder-grid relative w-full overflow-hidden border border-line bg-surface-muted",
        rounded,
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-transparent" />
      {label ? (
        <span className="absolute bottom-4 left-4 rounded-full border border-line bg-white/85 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-400 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}
