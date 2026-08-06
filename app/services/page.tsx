import Link from 'next/link';
import type { Metadata } from 'next';
import { AddOnGrid } from '@/components/services/AddOnGrid';
import { ServiceFinder } from '@/components/services/ServiceFinder';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import { Badge, Container, Section, SectionHeading } from '@/components/ui/Primitives';
import { services } from '@/lib/content/services';
import { frequencies } from '@/lib/pricing';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Cleaning Services',
  description:
    'Standard, deep, move-in/move-out, recurring and Airbnb turnover cleaning — plus optional add-ons. Find the service that matches what your home needs.',
  path: '/services',
});

export default function ServicesPage() {
  return (
    <>
      <Section tone="gradient" className="pt-14 sm:pt-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="Services"
                title="Start with what your home is preparing for."
                lede="Five services, six cleaning modes and a set of optional add-ons. The difference between them is scope and pace — not how much we care about the result."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/instant-estimate">Get an instant estimate</Button>
                <Button href="/clean-match" variant="secondary">
                  Take CleanMatch
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="services-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container>
          <Reveal>
            <ServiceFinder />
          </Reveal>
        </Container>
      </Section>

      <Section tone="white" id="all-services">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Service categories"
              title="What each service actually covers."
            />
          </Reveal>

          <div className="mt-12 space-y-6">
            {services.map((service, index) => (
              <Reveal key={service.slug} delay={index * 0.05}>
                <article className="group grid gap-8 rounded-[2rem] border border-line bg-white p-6 transition-all duration-500 ease-luma hover:shadow-lift sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <Badge tone="mint">{service.eyebrow}</Badge>
                    <h3 className="mt-4 text-2xl sm:text-[1.75rem]">
                      <Link href={`/services/${service.slug}`} className="hover:text-accent-deep">
                        {service.name}
                      </Link>
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">
                      {service.summary}
                    </p>
                    <p className="mt-5 flex items-center gap-2 text-sm text-muted">
                      <Icon name="clock" size={16} className="text-accent" />
                      {service.duration}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button href={`/services/${service.slug}`} size="sm">
                        View service
                      </Button>
                      <Button href="/booking" variant="secondary" size="sm">
                        Book this
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="eyebrow mb-3">Included</p>
                      <ul className="space-y-2">
                        {service.included[0].items.slice(0, 5).map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm text-ink/85">
                            <Icon name="check" size={14} className="mt-1 flex-none text-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="eyebrow mb-3">Best for</p>
                      <ul className="space-y-2">
                        {service.bestFor.slice(0, 4).map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm text-muted">
                            <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-sage" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="pearl">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Frequency"
              title="Recurring options, stated plainly."
              lede="Recurring visits are priced per visit, with the frequency adjustment shown as its own line on every estimate."
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {frequencies.map((frequency, index) => (
              <Reveal key={frequency.id} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-line bg-white p-6">
                  <p className="font-display text-xl text-ink">{frequency.label}</p>
                  <p className="mt-2 text-sm text-muted">{frequency.note}</p>
                  <p className="mt-4 text-sm text-accent">
                    {frequency.multiplier === 1
                      ? 'Standard per-visit rate'
                      : `${Math.round((1 - frequency.multiplier) * 100)}% lower per visit`}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <p className="max-w-2xl text-sm text-muted">
              A custom frequency is available too — set it in Build Your Clean and we
              will confirm the schedule in writing before the first visit.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section tone="white" id="add-ons">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Add-ons"
              title="Add only what you want, priced on its own line."
              lede="Select a few to see how they change the length and cost of a visit. Nothing here is bundled into a service without you choosing it."
            />
          </Reveal>
          <Reveal className="mt-10" delay={0.05}>
            <AddOnGrid />
          </Reveal>
        </Container>
      </Section>

      <Section tone="gradient">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Still deciding between two services?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Build a plan and the estimator will tell you which service the scope
                actually matches — before you book anything.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/build-your-clean" size="lg">
                  Build my cleaning plan
                </Button>
                <Button href="/contact" variant="secondary" size="lg">
                  Ask a question
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
