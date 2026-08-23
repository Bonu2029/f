import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/container";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Simple monthly pricing for ${brand.name}.`,
};

export default function PricingPage() {
  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-6xl">
            Simple pricing.
          </h1>
          <p className="mt-6 text-lg text-ink-700">
            One monthly price. Every plan includes the dashboard and your
            customer service pages.
          </p>
        </div>

        <div className="mt-14">
          <PricingPlans />
        </div>
      </Container>
    </Section>
  );
}
