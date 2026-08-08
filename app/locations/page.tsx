import type { Metadata } from 'next';
import { LocationChecker } from '@/components/site/LocationChecker';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Service Areas',
  description:
    'Check whether LumaNest serves your ZIP code, see core and extended service zones, and request coverage for an area that is not listed yet.',
  path: '/locations',
});

export default function LocationsPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="Service areas"
                title="Find out in five digits."
                lede="Enter a ZIP code and we will tell you honestly whether we serve it, serve it on scheduled days, or have not confirmed it yet."
              />
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="locations-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <LocationChecker />
        </Container>
      </Section>

      <Section tone="pearl">
        <Container narrow>
          <Reveal>
            <SectionHeading
              eyebrow="How zones work"
              title="Why some areas run on set days."
              lede="Travel time is real work. Grouping extended areas by day keeps arrival windows accurate and recurring plans consistent, rather than pushing that cost onto customers as unpredictable timing."
            />
          </Reveal>
          <Reveal className="mt-8">
            <Note title="A note on expansion">
              City pages will be added as coverage is confirmed, using one shared,
              reusable page structure. We will not publish pages for cities we do not
              actually serve — thin location pages help nobody and mislead customers.
            </Note>
          </Reveal>
          <Reveal className="mt-8">
            <div className="flex flex-wrap gap-3">
              <Button href="/booking">Book a cleaning</Button>
              <Button href="/contact" variant="secondary">
                Ask about my area
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
