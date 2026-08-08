import type { Metadata } from 'next';
import { JourneyTimeline } from '@/components/site/JourneyTimeline';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'How It Works',
  description:
    'From the first plan to the completed cleaning report: how a LumaNest visit is booked, prepared, carried out and documented.',
  path: '/how-it-works',
});

const promises = [
  {
    icon: 'clock',
    title: 'A window, not a whole day',
    body: 'You get a two-to-three hour arrival window and a message when the team is on the way.',
  },
  {
    icon: 'document',
    title: 'A written record',
    body: 'Every visit ends with a checklist of what was done, what was skipped and why.',
  },
  {
    icon: 'refresh',
    title: 'Adjustments carry forward',
    body: 'Feedback becomes part of the plan we follow next time, not a note that gets lost.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="How it works"
                title="Everything visible, from the first click to the last room."
                lede="No mystery pricing, no vague arrival times and no wondering what happened while you were out."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/build-your-clean">Build my plan</Button>
                <Button href="/booking" variant="secondary">
                  Book a cleaning
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="how-it-works-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The journey"
              title="Eight steps, start to finish."
              lede="Most of them take less than a minute. The ones that matter — preferences and access — are saved so you only do them once."
            />
          </Reveal>
          <div className="mt-14">
            <JourneyTimeline />
          </div>
        </Container>
      </Section>

      <Section tone="pearl">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="What you can count on" title="Three things we hold ourselves to." />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {promises.map((promise, index) => (
              <Reveal key={promise.title} delay={index * 0.07}>
                <div className="h-full rounded-3xl border border-line bg-white p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/45 text-accent-deep">
                    <Icon name={promise.icon} size={20} />
                  </span>
                  <h3 className="mt-5 text-xl">{promise.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{promise.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <Note title="Where we stop">
              We do not promise same-day availability, guaranteed deposit refunds, or a
              specific cleaner every single visit. Those depend on things outside our
              control, and we would rather set an expectation we can meet.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="gradient">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Ready to see what your visit would look like?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Build a plan, get an estimate or take CleanMatch. None of them require
                an account or an email address.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/build-your-clean" size="lg">
                  Build my cleaning plan
                </Button>
                <Button href="/clean-match" variant="secondary" size="lg">
                  Take CleanMatch
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
