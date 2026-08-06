import type { Metadata } from 'next';
import { BuildYourClean } from '@/components/tools/BuildYourClean';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Build Your Clean',
  description:
    'Design a cleaning visit room by room: choose rooms, set per-room priorities, add optional tasks, record household preferences and see a live estimate.',
  path: '/build-your-clean',
});

export default function BuildYourCleanPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Build your clean"
              title="Design your cleaning visit, room by room."
              lede="Eight short steps. Nothing is added that you did not choose, and you will see the estimate update as you go."
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container>
          <BuildYourClean />
        </Container>
      </Section>
    </>
  );
}
