import type { Metadata } from 'next';
import { GalleryGrid } from '@/components/site/GalleryGrid';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Before & After',
  description:
    'Draggable before-and-after comparisons across kitchens, bathrooms, bedrooms, living rooms, move-out cleaning, deep cleaning and rental turnover.',
  path: '/before-after',
});

export default function BeforeAfterPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Before and after"
              title="Cleaning transformations, dragged into view."
              lede="Each example lists the service used, the areas addressed and roughly how long that portion of the visit took."
            />
          </Reveal>
          <Reveal className="mt-8" delay={0.06}>
            <Note title="What you are looking at">
              Every comparison on this page is a demonstration example created for this
              website. None of it represents a verified customer project. When customer
              work is published, it will be labelled as verified and shown only with
              written permission from the homeowner.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container>
          <GalleryGrid />
        </Container>
      </Section>

      <Section tone="pearl">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Curious what your rooms would look like?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Send photos with a quote request and we will tell you what is realistic
                — including anything that is surface damage rather than soil.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/contact#photo-quote" size="lg">
                  Send a photo quote request
                </Button>
                <Button href="/booking" variant="secondary" size="lg">
                  Book a cleaning
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
