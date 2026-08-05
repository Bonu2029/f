import { ASPECT_RATIO, image as slotFor } from "@/lib/images";

type Frame = "petal" | "leaf" | "arch" | "pebble" | "soft" | "none";

const FRAME_CLASS: Record<Frame, string> = {
  petal: "frame-petal",
  leaf: "frame-leaf",
  arch: "frame-arch",
  pebble: "frame-pebble",
  soft: "frame-soft",
  none: "",
};

/** Must match the widths emitted by scripts/optimize-images.mjs. */
const WIDTHS = [480, 768, 1200];

/**
 * Photographs ship with responsive derivatives beside them. Serving the
 * original to every device meant a 390px phone downloading 1500px artwork —
 * roughly four times the pixels it can show.
 *
 * A native <img> is used rather than next/image: the static export target has
 * no optimiser behind it, so next/image was emitting a single full-size source
 * anyway. This way both build targets behave identically and the srcset is
 * real in both.
 */
function buildSrcSet(src: string): string | undefined {
  if (!src.endsWith(".webp")) return undefined; // placeholder SVGs have no derivatives
  const base = src.replace(/\.webp$/, "");
  return WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

type Props = {
  /** Slot id from src/lib/images.ts */
  slot: string;
  frame?: Frame;
  className?: string;
  /** Tells the browser how wide this renders, so it can pick from the srcset. */
  sizes?: string;
  priority?: boolean;
  /** Zoom the art on hover of the nearest `.group` ancestor. */
  hoverZoom?: boolean;
  /** Override the manifest aspect (e.g. to crop a portrait into a band). */
  aspect?: string;
  /** Decorative art gets an empty alt regardless of the manifest. */
  decorative?: boolean;
};

export default function Art({
  slot,
  frame = "soft",
  className = "",
  sizes = "(max-width: 768px) 92vw, (max-width: 1280px) 48vw, 40vw",
  priority = false,
  hoverZoom = true,
  aspect,
  decorative = false,
}: Props) {
  const art = slotFor(slot);
  const srcSet = buildSrcSet(art.src);

  return (
    <div
      className={`relative overflow-hidden bg-shell ${FRAME_CLASS[frame]} ${className}`}
      style={{ aspectRatio: aspect ?? ASPECT_RATIO[art.aspect] }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art.src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={decorative ? "" : art.alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        aria-hidden={decorative || undefined}
        className={`absolute inset-0 h-full w-full object-cover ${
          hoverZoom
            ? "transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            : ""
        }`}
      />

      {/* Warm inner light — stops any image reading as a flat rectangle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,252,247,0.42),transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ivory/45"
        style={{ borderRadius: "inherit" }}
      />
    </div>
  );
}
