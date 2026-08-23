import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { PhoneMock } from "@/components/marketing/phone-mock";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "How It Works",
  description: brand.description,
};

const steps = [
  {
    number: "1",
    title: "Attach",
    body: `Place a ${brand.tagNoun} on the product or equipment you install.`,
  },
  {
    number: "2",
    title: "Tap",
    body: "Your customer taps the tag whenever they need service.",
  },
  {
    number: "3",
    title: "Return",
    body: "They instantly reach your business instead of searching for someone else.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section className="pb-10 sm:pb-14">
        <Container>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink-950 sm:text-6xl">
            One tag. Three simple steps.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-700">
            {brand.secondaryMessage}
          </p>
        </Container>
      </Section>

      <Container>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-7">
          {steps.map((step) => (
            <div key={step.number}>
              <ImagePlaceholder ratio="4 / 3" rounded="rounded-2xl" />
              <div className="mt-5 flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-ink-950 text-xs font-semibold text-white">
                  {step.number}
                </span>
                <h2 className="text-xl font-semibold text-ink-950">
                  {step.title}
                </h2>
              </div>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Container>

      <Section muted className="mt-20">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="mx-auto w-full max-w-[19rem] lg:mx-0">
              <PhoneMock />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
                What the customer sees.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-700">
                A page branded for your business, with everything they need in
                one tap.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Request service",
                  "Book an appointment",
                  "Call or text you",
                  "See what was installed and when",
                  "Check warranty information",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[1.0625rem] text-ink-900"
                  >
                    <span
                      aria-hidden
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/signup" size="lg" className="mt-9">
                Get Started
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
