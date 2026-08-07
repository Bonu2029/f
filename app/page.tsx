import Link from 'next/link';
import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { RoomExplorer } from '@/components/home/RoomExplorer';
import { BuildPreview } from '@/components/home/BuildPreview';
import { StepsPath } from '@/components/home/StepsPath';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { ComparisonSlider } from '@/components/ui/ComparisonSlider';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import {
  Badge,
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/ui/Primitives';
import { TestimonialCarousel } from '@/components/ui/TestimonialCarousel';
import { cleaningModes, trustPoints } from '@/lib/content/general';
import { membershipTiers } from '@/lib/content/membership';
import { pageMeta } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: '/',
});

const personalizationInputs = [
  'Number of rooms',
  'Home size',
  'Surface materials',
  'Pets',
  'Children',
  'Product sensitivities',
  'Priority areas',
  'Access instructions',
  'Preferred cleaning style',
];

const bandCopy =
  'The details most people notice last are the ones we set up first: folded linens, cleared surfaces, a door that opens onto order.';

const modeTones: Record<string, string> = {
  mint: 'bg-mint/40',
  airy: 'bg-airy/40',
  champagne: 'bg-champagne/40',
  lavender: 'bg-lavender/45',
  sage: 'bg-sage/35',
};

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Home reset introduction */}
      <Section tone="plain">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="The LumaNest idea"
                title="Cleaning should not be one-size-fits-all."
                lede="Two homes with the same square footage can need completely different visits. We build your plan from what is actually in your home — and then we keep it."
              />
              <ul className="mt-8 flex flex-wrap gap-2">
                {personalizationInputs.map((input) => (
                  <li key={input}>
                    <Badge tone="outline">{input}</Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/home-profile" variant="secondary">
                  See My Home Profile
                </Button>
                <Button href="/how-it-works" variant="quiet">
                  How a visit works →
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              {/* Portrait photograph — keeping a 4:5 frame at every width avoids
                  cropping the bench and the light on the wall above it. */}
              <EditorialImage id="home-reset-editorial" aspect="aspect-[4/5]" />
            </Reveal>
          </div>

          <Reveal className="mt-16" delay={0.05}>
            <div className="rounded-[2rem] border border-line bg-pearl/40 p-5 sm:p-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Explore the plan</p>
                  <h3 className="mt-2 text-2xl sm:text-3xl">
                    Hover a room to see what a visit includes.
                  </h3>
                </div>
                <p className="max-w-sm text-sm text-muted">
                  Every room can also be set to a detailed clean, organization help
                  or fragrance-free products in the full builder.
                </p>
              </div>
              <RoomExplorer />
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Signature feature preview */}
      <Section tone="white" id="build-preview">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Signature feature"
              title="Design your cleaning visit room by room."
              lede="Choose the rooms that matter, add the tasks you actually want and watch the visit take shape. Nothing is added to your plan that you did not select."
            />
          </Reveal>
          <div className="mt-12">
            <BuildPreview />
          </div>
        </Container>
      </Section>

      {/* Smart cleaning modes */}
      <Section tone="pearl">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Cleaning modes"
              title="Six ways a visit can be shaped."
              lede="Modes sit on top of any service. Pick one when you book, or save a default in your home profile."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cleaningModes.map((mode, index) => (
              <Reveal key={mode.id} delay={index * 0.06}>
                <article className="group h-full rounded-3xl border border-line bg-white p-7 transition-all duration-500 ease-luma hover:-translate-y-1 hover:shadow-lift">
                  <span
                    className={`mb-6 flex h-11 w-11 items-center justify-center rounded-2xl text-accent-deep ${modeTones[mode.tone]}`}
                    aria-hidden="true"
                  >
                    <Icon name={modeIcon(mode.id)} size={20} />
                  </span>
                  <h3 className="text-xl">{mode.name}</h3>
                  <p className="mt-1 text-sm font-medium text-accent">{mode.tagline}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">{mode.body}</p>
                  <ul className="mt-5 space-y-2 border-t border-line pt-5">
                    {mode.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-ink/80">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-sage" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center gap-4">
              <Button href="/build-your-clean">Choose a mode in the builder</Button>
              <Link href="/services" className="link-underline text-[15px] text-muted">
                Compare all services
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Full-width editorial band */}
      <Reveal>
        <div className="relative">
          <EditorialImage
            id="home-modes"
            aspect="aspect-[4/3] sm:aspect-[21/9]"
            rounded="rounded-none"
            className="border-x-0"
            showLabel={false}
            sizes="100vw"
          />
          {/* The photograph keeps its clear space on the right, so the overlay
              sits there — and drops below the image entirely on small screens. */}
          <div className="pointer-events-none absolute inset-0 hidden items-end sm:flex">
            <Container className="pb-8 lg:pb-12">
              <div className="flex justify-end">
                <p className="max-w-md rounded-2xl bg-white/88 p-5 font-display text-xl leading-snug text-ink backdrop-blur-sm lg:text-2xl">
                  {bandCopy}
                </p>
              </div>
            </Container>
          </div>
        </div>
        <Container className="py-7 sm:hidden">
          <p className="font-display text-xl leading-snug text-ink">{bandCopy}</p>
        </Container>
      </Reveal>

      {/* How it works */}
      <Section tone="plain">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Four steps, and none of them are a phone call you did not want."
              lede="From the first plan to the completed report, the process is written down and visible to you the whole way."
            />
          </Reveal>
          <div className="mt-14">
            <StepsPath />
          </div>
          <Reveal className="mt-12">
            <Button href="/how-it-works" variant="secondary">
              See the full journey
            </Button>
          </Reveal>
        </Container>
      </Section>

      {/* Trust */}
      <Section tone="mint">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="Trust and care"
                title="Documented procedures, not slogans."
                lede="We use documented procedures designed to reduce risk and protect customer privacy — and we describe them plainly so you can judge them yourself."
              />
              <Button href="/trust-safety" variant="secondary" className="mt-8">
                Read Trust & Safety
              </Button>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustPoints.map((point, index) => (
                <Reveal key={point.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-white/70 bg-white/80 p-5 backdrop-blur-sm">
                    <p className="text-[15px] font-medium text-ink">{point.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Before and after */}
      <Section tone="white">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <ComparisonSlider
                imageId="ba-kitchen"
                caption="Demonstration image created for this website — not a customer project."
              />
            </Reveal>
            <Reveal delay={0.08}>
              <SectionHeading
                eyebrow="Before and after"
                title="The difference is easier to drag than to describe."
                lede="Kitchens, bathrooms, living rooms and move-out units, each with the service used, the areas addressed and roughly how long it took."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/before-after">Explore Cleaning Transformations</Button>
              </div>
              <p className="mt-5 text-sm text-muted">
                Customer photographs are published only with written permission.
                Everything in the gallery today is labelled as a demonstration.
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Membership preview */}
      <Section tone="gradient">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <Reveal>
              <EditorialImage id="home-membership" aspect="aspect-[3/2]" />
            </Reveal>
            <Reveal delay={0.08}>
              <SectionHeading
                eyebrow="LumaCare Membership"
                title="A cleaner home, without starting over every time."
                lede="Membership is mostly about memory: your plan, your preferences and your schedule stay in place, so each visit begins where the last one ended."
              />
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  'Preferred scheduling',
                  'Saved home preferences',
                  'Consistent cleaning plans',
                  'Member pricing',
                  'Seasonal cleaning reminders',
                  'Priority rescheduling',
                  'Cleaning history',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5 text-[15px] text-ink/85">
                    <Icon name="check" size={16} className="text-accent" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button href="/membership">See membership options</Button>
                <span className="text-sm text-muted">
                  {membershipTiers.length} tiers · pricing to be confirmed
                </span>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Reviews */}
      <Section tone="plain">
        <Container narrow>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Reviews"
              title="What customers tell us."
              lede="Real reviews will appear here once customers have given permission to publish them. Until then, these are clearly labelled samples."
            />
          </Reveal>
          <Reveal className="mt-12" delay={0.06}>
            <TestimonialCarousel />
          </Reveal>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section tone="white">
        <Container>
          <Reveal>
            <Card className="relative overflow-hidden bg-luma-gradient p-8 sm:p-14">
              <div className="relative max-w-2xl">
                <p className="eyebrow">Ready when you are</p>
                <h2 className="mt-4 text-balance text-3xl leading-tight sm:text-[2.75rem]">
                  Your home already has a rhythm. Your cleaning service should
                  follow it.
                </h2>
                <p className="lede mt-5">
                  Build a plan in a few minutes, or book a visit and let your saved
                  preferences do the explaining.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href="/build-your-clean" size="lg">
                    Build My Cleaning Plan
                  </Button>
                  <Button href="/booking" variant="secondary" size="lg">
                    Book a Cleaning
                  </Button>
                </div>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}

function modeIcon(id: string) {
  const map: Record<string, string> = {
    'everyday-reset': 'refresh',
    'deep-restore': 'sparkle',
    'guest-ready': 'star',
    'quiet-clean': 'bellOff',
    'pet-friendly': 'pet',
    'fragrance-free': 'leaf',
  };
  return map[id] ?? 'sparkle';
}
