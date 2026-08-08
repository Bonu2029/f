import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import {
  Badge,
  CheckList,
  Container,
  Note,
  PlaceholderTag,
  Section,
  SectionHeading,
} from '@/components/ui/Primitives';
import {
  membershipTerms,
  membershipTiers,
  seasonalSuggestions,
} from '@/lib/content/membership';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'LumaCare Membership',
  description:
    'Three membership tiers with saved plans, preferred scheduling, priority rescheduling, rotating detail focus and member pricing. Billing and cancellation terms stated plainly.',
  path: '/membership',
});

export default function MembershipPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="LumaCare Membership"
                title="A cleaner home, without starting over every time."
                lede="Membership is mostly about memory. Your plan, your preferences and your schedule stay in place, so each visit begins where the last one ended."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/booking">Start a membership</Button>
                <Button href="/instant-estimate" variant="secondary">
                  See per-visit pricing
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="membership-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Tiers" title="Three rhythms. Same standard." />
              <PlaceholderTag>Pricing not yet finalized</PlaceholderTag>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {membershipTiers.map((tier, index) => (
              <Reveal key={tier.id} delay={index * 0.07}>
                <article
                  className={`relative flex h-full flex-col rounded-[2rem] border p-7 transition-all duration-500 ease-luma hover:-translate-y-1 hover:shadow-lift ${
                    tier.featured
                      ? 'border-accent bg-luma-gradient shadow-soft'
                      : 'border-line bg-white'
                  }`}
                >
                  {tier.featured ? (
                    <span className="absolute -top-3 left-7">
                      <Badge tone="mint">Most chosen</Badge>
                    </span>
                  ) : null}

                  <p className="eyebrow">{tier.cadence}</p>
                  <h2 className="mt-2 text-2xl">{tier.name}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    {tier.positioning}
                  </p>

                  <div className="mt-6 rounded-2xl border border-line bg-white/70 p-5">
                    <p className="font-display text-3xl text-ink">{tier.pricePlaceholder}</p>
                    <p className="mt-1 text-sm text-muted">{tier.priceNote}</p>
                  </div>

                  <CheckList items={tier.benefits} className="mt-6 flex-1" />

                  <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
                    <span className="font-medium text-ink">Best for: </span>
                    {tier.bestFor}
                  </p>

                  <Button
                    href="/booking"
                    variant={tier.featured ? 'primary' : 'secondary'}
                    className="mt-6 w-full"
                  >
                    Choose {tier.name}
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <Note title="About the pricing above">
              The price fields are deliberately empty. Membership rates depend on home
              size, scope and service area, and we will not publish a number we have not
              confirmed. Run an instant estimate for a realistic per-visit figure in the
              meantime.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="pearl" id="seasonal">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="Seasonal Reset Planner"
                title="Suggestions at the right time of year — never added automatically."
                lede="Members get a short seasonal note with optional tasks. Nothing appears on your bill unless you choose it."
              />
              <Button href="/build-your-clean" variant="secondary" className="mt-8">
                Add a seasonal task to my plan
              </Button>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {seasonalSuggestions.map((season, index) => (
                <Reveal key={season.season} delay={index * 0.06}>
                  <div className="h-full rounded-2xl border border-line bg-white p-6">
                    <div className="flex items-center gap-2">
                      <Icon name="leaf" size={18} className="text-accent" />
                      <h3 className="text-lg">{season.season}</h3>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-ink/85">
                      {season.items.map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-sage" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container narrow>
          <Reveal>
            <SectionHeading
              eyebrow="Terms in plain language"
              title="Billing, cancellation and everything people actually ask."
              lede="Where something has not been finalized, we say so rather than filling the gap with a guess."
            />
          </Reveal>
          <Reveal className="mt-8" delay={0.05}>
            <Accordion items={membershipTerms} defaultOpen={0} />
          </Reveal>
          <Reveal className="mt-8">
            <p className="text-sm text-muted">
              The binding version of these terms lives on the{' '}
              <a href="/terms" className="link-underline">
                terms page
              </a>{' '}
              and is presented again before you confirm a membership.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section tone="gradient">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Not ready for a membership?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                One-time visits are always available, and everything you save — plan,
                preferences, zones — carries over if you switch later.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/booking" size="lg">
                  Book a one-time visit
                </Button>
                <Button href="/clean-match" variant="secondary" size="lg">
                  Find my frequency
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
