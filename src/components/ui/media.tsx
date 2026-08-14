import { fnv1a, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

/**
 * Deterministic local artwork.
 *
 * The prototype ships no photography — using stock images of real salons would
 * imply real businesses participate. Instead every business, service and staff
 * member gets a stable, hand-picked colourway derived from its seed, with the
 * category mark as a watermark. It renders instantly, works offline, and reads
 * as a designed placeholder rather than a broken image.
 *
 * Swapping in real media means replacing this component with <Image> — the
 * `seed` prop maps onto a storage path.
 */

const PALETTES: Array<[string, string, string]> = [
  ["#FFEBD8", "#FFCBA4", "#8A4B1F"],
  ["#E6EAFF", "#C6D0FF", "#2F3C93"],
  ["#E7F6EC", "#C2E6CF", "#1C6B42"],
  ["#F2EAFF", "#D9C7FF", "#4A2ECB"],
  ["#E8F3F6", "#C4E0E9", "#1B5A6B"],
  ["#FDE9EE", "#F7C9D5", "#93304C"],
  ["#F1EFE8", "#DCD7C9", "#5B5443"],
  ["#FFF6DC", "#FFE6A6", "#7A5A0B"],
  ["#EDEAFF", "#D3CCFB", "#3B2F9E"],
  ["#E9F0E4", "#CBDCC0", "#3F5A2E"],
];

function paletteFor(seed: string): [string, string, string] {
  return PALETTES[fnv1a(seed) % PALETTES.length];
}

export function Media({
  seed,
  icon,
  label,
  className,
  rounded = "rounded-xl",
  showMark = true,
}: {
  seed: string;
  icon?: string;
  label?: string;
  className?: string;
  rounded?: string;
  showMark?: boolean;
}) {
  const [from, to, ink] = paletteFor(seed);
  const angle = 120 + (fnv1a(`${seed}-a`) % 100);

  return (
    <div
      className={cn("relative overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {/* soft radial highlight keeps flat gradients from looking cheap */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 78% 12%, rgba(255,255,255,0.65), transparent 62%)`,
        }}
      />
      {showMark && icon && (
        <CategoryIcon
          icon={icon}
          strokeWidth={1.4}
          className="absolute -bottom-3 -right-2 h-[62%] w-[62%] opacity-[0.22]"
          // eslint-disable-next-line react/no-unknown-property
        />
      )}
      <span className="sr-only">{label}</span>
      <div
        className="absolute inset-0"
        style={{ boxShadow: `inset 0 0 0 1px ${ink}12` }}
      />
    </div>
  );
}

/** Circular avatar built from the same palette system. */
export function Avatar({
  seed,
  name,
  className,
  size = 40,
}: {
  seed: string;
  name: string;
  className?: string;
  size?: number;
}) {
  const [from, to, ink] = paletteFor(seed);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${from}, ${to})`,
        color: ink,
        fontSize: Math.max(11, Math.round(size * 0.36)),
        boxShadow: `inset 0 0 0 1px ${ink}1a`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Wide cover used on business profiles and dashboard headers. */
export function Cover({
  seed,
  icon,
  className,
}: {
  seed: string;
  icon?: string;
  className?: string;
}) {
  const [from, to, ink] = paletteFor(seed);
  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(128deg, ${from} 0%, ${to} 100%)` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 120% at 12% 0%, rgba(255,255,255,0.72), transparent 55%)`,
        }}
      />
      {icon && (
        <CategoryIcon
          icon={icon}
          strokeWidth={1.1}
          className="absolute right-[-2%] top-1/2 h-[104%] w-auto -translate-y-1/2 opacity-[0.13]"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(to top, ${ink}14, transparent)` }} />
    </div>
  );
}
