import type { Metadata } from 'next';
import { CleanMatch } from '@/components/tools/CleanMatch';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'CleanMatch',
  description:
    'Answer twelve short questions and get a recommended cleaning service, frequency, cleaning mode, useful add-ons and an estimated visit duration.',
  path: '/clean-match',
});

export default function CleanMatchPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container narrow>
          <Reveal>
            <SectionHeading
              level={1}
              align="center"
              eyebrow="CleanMatch"
              title="Find the cleaning experience that fits your home and lifestyle."
              lede="Twelve questions, about two minutes, no email address. You will get a service, a frequency, a mode and a realistic visit length."
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container narrow>
          <CleanMatch />
        </Container>
      </Section>
    </>
  );
}
