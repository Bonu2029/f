import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { brand } from "@/config/brand";
import { featuredCategories } from "@/config/business-types";

export const metadata: Metadata = {
  title: "For Businesses",
  description: `${brand.name} for plumbing, HVAC, electrical, pool, appliance and window businesses.`,
};

const points = [
  {
    title: "Set up an installation in under a minute",
    body: "Enter the tag ID, the customer, and what you installed. That's it.",
  },
  {
    title: "Update anything, anytime",
    body: "Change your phone number or service page and every tag you've ever placed updates too.",
  },
  {
    title: "See requests in one place",
    body: "Service requests from your tags land in your dashboard.",
  },
];

export default function ForBusinessesPage() {
  return (
    <>
      <Section className="pb-12">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-6xl">
                Built for businesses that install and service things.
              </h1>
              <p className="mt-6 max-w-lg text-lg text-ink-700">
                You already did the hard part. {brand.name} keeps you attached to
                the work you finished.
              </p>
              <ButtonLink href="/signup" size="lg" className="mt-9">
                Get Started
              </ButtonLink>
            </div>
            <ImagePlaceholder label="Technician placing a tag" ratio="4 / 3" />
          </div>
        </Container>
      </Section>

      <Section muted>
        <Container>
          <ul className="grid gap-5 sm:grid-cols-3">
            {points.map((point) => (
              <li
                key={point.title}
                className="rounded-2xl border border-line bg-white p-7 shadow-soft"
              >
                <h2 className="text-lg font-semibold text-ink-950">
                  {point.title}
                </h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            Who uses it.
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featuredCategories.map((category) => (
              <li
                key={category}
                className="rounded-xl border border-line bg-white px-4 py-5 text-center text-sm font-medium text-ink-900 shadow-soft"
              >
                {category}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-500">
            And many more service businesses.
          </p>
        </Container>
      </Section>
    </>
  );
}
