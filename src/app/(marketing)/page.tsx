import {
  CustomerExperience,
  FinalCta,
  Hero,
  HowItWorks,
  PricingSection,
  ValueSection,
  WhoItIsFor,
} from "@/components/marketing/home-sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ValueSection />
      <CustomerExperience />
      <WhoItIsFor />
      <PricingSection />
      <FinalCta />
    </>
  );
}
