import Image from "next/image";
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

type Props = {
  /** Slot id from src/lib/images.ts */
  slot: string;
  frame?: Frame;
  className?: string;
  /** Wrapper sizing hint for next/image. */
  sizes?: string;
  priority?: boolean;
  /** Zoom the art on hover of the nearest `.group` ancestor. */
  hoverZoom?: boolean;
  /** Override the manifest aspect (e.g. to crop a portrait into a band). */
  aspect?: string;
  /** Decorative art gets an empty alt regardless of the manifest. */
  decorative?: boolean;
};

/**
 * Every image on the site goes through here, so art direction — framing,
 * grain, the warm inner light — stays identical whether the source is a
 * generated placeholder or a real photograph.
 */
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
  const isVector = art.src.endsWith(".svg");

  return (
    <div
      className={`relative overflow-hidden bg-shell ${FRAME_CLASS[frame]} ${className}`}
      style={{ aspectRatio: aspect ?? ASPECT_RATIO[art.aspect] }}
    >
      <Image
        src={art.src}
        alt={decorative ? "" : art.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        unoptimized={isVector}
        aria-hidden={decorative || undefined}
        className={`object-cover ${
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
