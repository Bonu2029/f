import type { Metadata } from 'next';
import { BookingFlow } from '@/components/tools/BookingFlow';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Book a Cleaning',
  description:
    'Book a LumaNest cleaning in nine clear steps: service, property, rooms, preferences, date, details, review, payment and confirmation.',
  path: '/booking',
});

export default function BookingPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Booking"
              title="Book a visit without a phone call."
              lede="Nine steps, all of them visible from the start. You will see the plan, the arrival window and the full price breakdown before anything is confirmed."
            />
          </Reveal>
          <Reveal className="mt-8" delay={0.06}>
            <Note title="No account required">
              You can see availability and a price before creating anything. An account
              only becomes useful when you want to manage recurring visits or keep
              preferences across devices.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container>
          <BookingFlow />
        </Container>
      </Section>
    </>
  );
}
