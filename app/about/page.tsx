import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import {
  Container,
  Note,
  PlaceholderTag,
  Section,
  SectionHeading,
} from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'About LumaNest',
  description:
    'Why LumaNest builds a different cleaning plan for every home — our mission, values, service philosophy, training approach and sustainability practices.',
  path: '/about',
});

const values = [
  {
    title: 'Respect for the home',
    body: 'Someone lives here. We work around that rather than through it, and we leave things where you keep them.',
  },
  {
    title: 'Reliable communication',
    body: 'A window you can plan around, a message when we are on the way, and a report when we are done.',
  },
  {
    title: 'Transparent service',
    body: 'Itemized estimates, a stated scope and a written record of what was and was not completed.',
  },
  {
    title: 'Thoughtful details',
    body: 'The folded towel, the straightened chair, the cord tucked away. The parts nobody asks for.',
  },
  {
    title: 'Consistency',
    body: 'The plan does not drift between visits. That is the entire point of saving it.',
  },
  {
    title: 'Privacy',
    body: 'Do Not Disturb Zones, restricted access to your details and photos only with permission.',
  },
  {
    title: 'Continuous improvement',
    body: 'Feedback changes the plan we follow next time, not just the reply you receive.',
  },
];

const philosophy = [
  {
    icon: 'home',
    title: 'Start from the home, not the price list',
    body: 'We ask what is actually in the space — surfaces, pets, sensitivities, priorities — and build the visit from there.',
  },
  {
    icon: 'users',
    title: 'One team, one standard',
    body: 'Every cleaner works from the same documented procedures, so a different name on the schedule does not mean a different result.',
  },
  {
    icon: 'document',
    title: 'Write it down',
    body: 'Preferences, exclusions, notes and outcomes are recorded. Nothing important should live in someone’s memory.',
  },
  {
    icon: 'leaf',
    title: 'Choose the gentlest thing that works',
    body: 'Product choice starts with the surface and the household, not with whatever is strongest.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="About us"
                title="Every home is different, so every cleaning plan should be too."
                lede="LumaNest was created around that one idea. The rest — the builder, the profile, the reports — exists to make it practical rather than a slogan."
              />
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="about-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <SectionHeading eyebrow="Mission" title="Make a clean home a routine, not a project." />
            </Reveal>
            <Reveal delay={0.06}>
              <div className="max-w-prose space-y-5 text-[17px] leading-relaxed text-muted">
                <p>
                  Most cleaning services sell a package. You pick a size, they send a
                  team, and everything specific about your home — the marble that cannot
                  take acid, the cat who bolts for open doors, the desk nobody should
                  touch — has to be explained again every time.
                </p>
                <p>
                  LumaNest starts from the opposite direction. We collect the details
                  once, keep them, and build each visit from them. The result is not a
                  dramatically different cleaning. It is a dramatically less effortful
                  one for the person who lives there.
                </p>
                <p>
                  We combine professional cleaning with personalized home preferences,
                  clear communication and thoughtful details. That is the whole company.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Service philosophy" title="How we approach the work." />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {philosophy.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <div className="h-full rounded-3xl border border-line bg-pearl/40 p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-accent">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <h3 className="mt-5 text-xl">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="pearl">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Core values" title="Seven things we are trying to be." />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.05}>
                <div className="h-full rounded-2xl border border-line bg-white p-6">
                  <h3 className="text-lg">{value.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <div className="grid gap-8 lg:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-[2rem] border border-line bg-white p-7">
                <PlaceholderTag>Awaiting real details</PlaceholderTag>
                <h2 className="mt-4 text-2xl">Our team</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Team member profiles, photographs and role descriptions go here. We
                  have deliberately not invented names, headshots or biographies —
                  those must come from the real team, with their consent.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="h-full rounded-[2rem] border border-line bg-white p-7">
                <h2 className="text-2xl">Training approach</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  New team members work through surface identification, product chemistry
                  and privacy handling before their first solo visit, then shadow
                  experienced cleaners on real appointments. Refreshers happen when
                  procedures change rather than on an arbitrary calendar.
                </p>
                <Button href="/trust-safety#training" variant="quiet" className="mt-4">
                  See what training covers →
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="h-full rounded-[2rem] border border-line bg-white p-7">
                <h2 className="text-2xl">Sustainability</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  We use concentrated products with refillable bottles, microfiber that is
                  laundered and reused rather than discarded, and route planning that
                  reduces driving between homes. We are not claiming a certification we do
                  not hold.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal className="mt-8">
            <Note title="Community involvement">
              Local partnerships and donation programs will be described here once they
              are established and can be stated accurately. We have not invented a
              founding year, a team size, awards or years of experience anywhere on this
              site — those fields stay empty until the business supplies them.
            </Note>
          </Reveal>
        </Container>
      </Section>

      <Section tone="gradient">
        <Container narrow>
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl sm:text-4xl">
                Want to see how this works in your home?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Build a plan and you will understand the whole approach in about three
                minutes.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/build-your-clean" size="lg">
                  Build my cleaning plan
                </Button>
                <Button href="/contact" variant="secondary" size="lg">
                  Talk to us
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
