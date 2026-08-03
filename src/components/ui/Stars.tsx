import { Star } from "@/components/ui/Icons";

export function Stars({
  value,
  size = 14,
  className = "",
  label,
}: {
  value: number;
  size?: number;
  className?: string;
  /** Overrides the generated accessible label. */
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[0.2em] text-copper-500 ${className}`}
      role="img"
      aria-label={label ?? `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          filled={i <= Math.round(value)}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? "" : "opacity-30"}
        />
      ))}
    </span>
  );
}
