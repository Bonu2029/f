import Link from 'next/link';
import { AddOnGrid } from './AddOnGrid';
import { Reveal } from '@/components/motion/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import {
  Badge,
  CheckList,
  Container,
  ExcludeList,
  Note,
  Section,
  SectionHeading,
} from '@/components/ui/Primitives';
import { getService, services, type ServiceDetail } from '@/lib/content/services';
import { faqJsonLd, serviceJsonLd } from '@/lib/seo';

export function ServiceDetailPage({ service }: { service: ServiceDetail }) {
  const related = service.relatedSlugs
    .map((slug) => getService(slug))
    .filter((item): item is ServiceDetail => Boolean(item));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            serviceJsonLd({
              name: service.name,
              description: service.metaDescription,
              path: `/services/${service.slug}`,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(service.faqs)) }}
      />

      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent-deep">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/services" className="hover:text-accent-deep">
                  Services
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink">{service.name}</li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <Badge tone="mint">{service.eyebrow}</Badge>
              <h1 className="mt-5 text-balance text-4xl leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
                {service.headline}
              </h1>
              <p className="lede mt-6 max-w-xl text-pretty">{service.summary}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/booking" size="lg">
                  Book {service.name.split(' ')[0].toLowerCase()} cleaning
                </Button>
                <Button href="/instant-estimate" variant="secondary" size="lg">
                  Get an estimate
                </Button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                <Icon name="clock" size={16} className="text-accent" />
                {service.duration}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id={service.heroImageId} aspect="aspect-[4/3]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <SectionHeading level={2} eyebrow="Who it is for" title="Is this the right visit?" />
            </Reveal>
            <Reveal delay={0.06}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {service.bestFor.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-line bg-white p-5 text-[15px] leading-relaxed text-ink/85"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="What is included" title="Everything in the plan." />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {service.included.map((group, index) => (
              <Reveal key={group.group} delay={index * 0.06}>
                <div className="h-full rounded-3xl border border-line bg-pearl/40 p-7">
                  <h3 className="text-xl">{group.group}</h3>
                  <CheckList items={group.items} className="mt-5" />
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <Reveal>
              <h3 className="text-2xl">What is not included</h3>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
                We would rather be clear now than apologetic later. Anything below can
                often be arranged separately — just ask.
              </p>
              <div className="mt-6">
                <ExcludeList items={service.notIncluded} />
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <h3 className="text-2xl">How to prepare</h3>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
                None of this is required. It simply lets the team spend the visit on
                cleaning rather than on figuring things out.
              </p>
              <CheckList items={service.preparation} className="mt-6" />
              <Note className="mt-6" title="A note on personal items">
                Please secure valuables, medications and personal documents before any
                visit. Rooms, drawers and desks can also be marked as Do Not Disturb
                Zones in your home profile.
              </Note>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="pearl">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Optional add-ons"
              title="Pair this service with the extras that fit."
              lede="Each add-on is priced separately and appears as its own line on the estimate."
            />
          </Reveal>
          <Reveal className="mt-10" delay={0.05}>
            <AddOnGrid filterIds={service.addOnIds} compact />
          </Reveal>
        </Container>
      </Section>

      <Section tone="white">
        <Container narrow>
          <Reveal>
            <SectionHeading eyebrow="Questions" title={`${service.name} — frequently asked`} />
          </Reveal>
          <Reveal className="mt-8" delay={0.05}>
            <Accordion items={service.faqs} defaultOpen={0} />
          </Reveal>
          <Reveal className="mt-8">
            <p className="text-sm text-muted">
              More answers on the{' '}
              <Link href="/faq" className="link-underline">
                full FAQ page
              </Link>
              , or{' '}
              <Link href="/contact" className="link-underline">
                send us a question
              </Link>
              .
            </p>
          </Reveal>
        </Container>
      </Section>

      {related.length ? (
        <Section tone="plain">
          <Container>
            <Reveal>
              <SectionHeading level={2} eyebrow="Also consider" title="Related services" />
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {related.map((item, index) => (
                <Reveal key={item.slug} delay={index * 0.06}>
                  <Link
                    href={`/services/${item.slug}`}
                    className="group block h-full rounded-3xl border border-line bg-white p-7 transition-all duration-500 ease-luma hover:-translate-y-1 hover:shadow-lift"
                  >
                    <Badge tone="airy">{item.eyebrow}</Badge>
                    <h3 className="mt-4 text-xl">{item.name}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                      View service
                      <Icon name="arrow" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section tone="gradient">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Ready to book {service.name.toLowerCase()}?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                You will see the plan, the arrival window and the price breakdown
                before anything is confirmed.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/booking" size="lg">
                  Book a cleaning
                </Button>
                <Button href="/build-your-clean" variant="secondary" size="lg">
                  Build a custom plan
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}

export function allServiceSlugs() {
  return services.map((service) => service.slug);
}
