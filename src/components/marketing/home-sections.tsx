import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PhoneMock } from "@/components/marketing/phone-mock";
import { brand } from "@/config/brand";
import { featuredCategories } from "@/config/business-types";

export function Hero() {
  return (
    <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="animate-rise">
            <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-ink-950 sm:text-6xl">
              Never lose an installed customer again.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700 sm:text-xl">
              Place a {brand.tagNoun} on every installation. When your customer
              needs you again, they tap their phone and come straight back to
              your business.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">
                Get Started
              </ButtonLink>
              <ButtonLink href="/how-it-works" size="lg" variant="secondary">
                See How It Works
              </ButtonLink>
            </div>

            <p className="mt-6 text-sm text-ink-500">
              {brand.secondaryMessage}
            </p>
          </div>

          <ImagePlaceholder
            label="Phone tapping a tag on equipment"
            ratio="4 / 3"
            className="animate-rise"
          />
        </div>
      </Container>
    </section>
  );
}

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

export function HowItWorks() {
  return (
    <Section id="how-it-works" muted>
      <Container>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
          One tag. Three simple steps.
        </h2>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-7">
          {steps.map((step) => (
            <div key={step.number}>
              <ImagePlaceholder
                ratio="4 / 3"
                className="bg-white"
                rounded="rounded-2xl"
              />
              <div className="mt-5 flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-ink-950 text-xs font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-ink-950">
                  {step.title}
                </h3>
              </div>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

const valueCards = [
  {
    title: "More Repeat Business",
    body: "Turn past installations into future service calls.",
  },
  {
    title: "Easier for Customers",
    body: "No app download. Just tap the tag.",
  },
  {
    title: "Always Connected",
    body: "Your contact and service page stays attached to the installation.",
  },
];

export function ValueSection() {
  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            You installed it. Keep the customer.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-700">
            When customers need service months or years later, they often search
            Google and call whoever appears first. {brand.name} gives them a
            direct path back to you.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-3">
          {valueCards.map((card) => (
            <li
              key={card.title}
              className="rounded-2xl border border-line bg-white p-7 shadow-soft"
            >
              <h3 className="text-lg font-semibold text-ink-950">
                {card.title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
                {card.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function CustomerExperience() {
  return (
    <Section muted>
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="mx-auto w-full max-w-[19rem] lg:mx-0">
            <PhoneMock />
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              Your customer sees your business — not ours.
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-ink-700">
              Each {brand.tagNoun} opens a page branded for the company that
              installed it.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "No account to create.",
                "No app to download.",
                "The tag opens straight in the phone browser.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-ink-900">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500"
                  />
                  <span className="text-[1.0625rem]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function WhoItIsFor() {
  return (
    <Section>
      <Container>
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Built for businesses that install and service things.
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
  );
}

export function PricingSection() {
  return (
    <Section id="pricing" muted>
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            Simple pricing.
          </h2>
          <p className="mt-5 text-lg text-ink-700">
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

export function FinalCta() {
  return (
    <Section>
      <Container>
        <div className="rounded-3xl border border-line bg-surface-muted px-6 py-20 text-center sm:px-16">
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            Every installation should bring customers back.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-700">
            Start turning the work you&rsquo;ve already completed into future
            business.
          </p>
          <ButtonLink href="/signup" size="lg" className="mt-9">
            Get Started
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
