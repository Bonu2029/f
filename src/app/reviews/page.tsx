import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/layout/PageTransition";
import { ReviewsBrowser } from "@/components/reviews/ReviewsBrowser";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight } from "@/components/ui/Icons";
import { breadcrumbSchema } from "@/lib/schema";
import { reviewStats } from "@/lib/data";

const stats = reviewStats();

export const metadata: Metadata = {
  title: "Reviews",
  description: `Read all ${stats.total} customer reviews of Ashgrove Barber Co. — filter by service or barber, sort by newest or highest rated, and leave your own.`,
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <PageTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Reviews", path: "/reviews" },
            ]),
          ),
        }}
      />

      <PageHeader
        breadcrumb="Reviews"
        eyebrow="Every Review"
        lines={["Read the room", "before you book."]}
        intro={`All ${stats.total} reviews, unedited and tied to real appointments. Filter by the barber or the service you're considering.`}
      />

      <section className="relative overflow-hidden bg-ivory-100 py-16 sm:py-24">
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="shell relative">
          <ReviewsBrowser />
        </div>
      </section>

      <section className="relative overflow-hidden bg-ivory-100 pb-20 sm:pb-28">
        <div className="shell relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <ReviewForm />

          <aside className="relative overflow-hidden rounded-[1.75rem] bg-navy-950 p-8 text-ivory-100">
            <div className="grain grain-light absolute inset-0 opacity-30" />
            <div className="relative">
              <span className="eyebrow text-copper-300">Before you write</span>
              <ul className="mt-6 flex flex-col gap-4 text-[0.875rem] leading-relaxed text-steel-200">
                {[
                  "Reviews are matched to an appointment before they go live, so use the name you booked under.",
                  "Naming your barber helps other people pick the right chair.",
                  "Something went wrong? Call the shop first — we would rather fix it than read about it.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-copper-400" />
                    {line}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/#booking"
                size="sm"
                className="mt-8"
                icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />}
              >
                Book a chair
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </PageTransition>
  );
}
