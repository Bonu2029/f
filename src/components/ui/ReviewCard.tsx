import { Quote } from "@/components/ui/Icons";
import { Stars } from "@/components/ui/Stars";
import { barberById, serviceById, type Review } from "@/lib/data";
import { formatReviewDate } from "@/lib/booking";

export function ReviewCard({
  review,
  tone = "light",
  className = "",
  featured = false,
}: {
  review: Review;
  /** `light` = ivory card, `dark` = navy card. */
  tone?: "light" | "dark";
  className?: string;
  featured?: boolean;
}) {
  const service = serviceById(review.serviceId);
  const barber = barberById(review.barberId);
  const dark = tone === "dark";

  return (
    <figure
      className={`relative flex h-full flex-col rounded-2xl border p-6 transition-colors duration-500 ${
        dark
          ? "border-ivory-100/12 bg-navy-800/60 text-ivory-100"
          : "border-navy-900/10 bg-ivory-50 text-navy-900"
      } ${featured ? (dark ? "border-copper-500/40" : "border-copper-500/45") : ""} ${className}`}
    >
      <Quote
        aria-hidden
        className={`h-5 w-auto shrink-0 ${dark ? "text-copper-400/60" : "text-copper-500/45"}`}
      />

      <div className="mt-4 flex items-center gap-3">
        <Stars value={review.rating} size={13} />
        <span
          className={`font-sans text-[0.625rem] tracking-[0.14em] uppercase ${
            dark ? "text-steel-400" : "text-navy-800/45"
          }`}
        >
          {formatReviewDate(review.date)}
        </span>
      </div>

      <blockquote
        className={`mt-4 flex-1 text-[0.9375rem] leading-relaxed ${
          dark ? "text-steel-200" : "text-navy-800/80"
        }`}
      >
        {review.body}
      </blockquote>

      <figcaption
        className={`mt-6 flex items-baseline justify-between gap-4 border-t pt-4 text-[0.75rem] ${
          dark ? "border-ivory-100/10" : "border-navy-900/10"
        }`}
      >
        <span className={dark ? "text-ivory-100" : "text-navy-900"}>{review.name}</span>
        <span className={dark ? "text-steel-400" : "text-navy-800/50"}>
          {service?.name}
          {barber ? ` · ${barber.name.split(" ")[0]}` : ""}
        </span>
      </figcaption>
    </figure>
  );
}
