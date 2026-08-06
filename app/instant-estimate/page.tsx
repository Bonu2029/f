import type { Metadata } from 'next';
import { InstantEstimate } from '@/components/tools/InstantEstimate';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Instant Estimate',
  description:
    'See a transparent, itemized cleaning estimate that updates as you choose your home size, cleaning level, add-ons and frequency.',
  path: '/instant-estimate',
});

export default function InstantEstimatePage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Instant estimate"
              title="A price you can see the inside of."
              lede="Every input maps to a line you can read. No single unexplained number, no account required, and no pressure to book at the end of it."
            />
          </Reveal>
          <Reveal className="mt-8" delay={0.06}>
            <Note title="How this estimate behaves">
              The total updates live as you change inputs. The final amount changes
              only when you change the scope, or when the property is substantially
              different from what was submitted. All rates on this page are
              placeholders until real pricing is approved.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container>
          <InstantEstimate />
        </Container>
      </Section>
    </>
  );
}
