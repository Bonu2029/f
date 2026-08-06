import type { Metadata } from 'next';
import { HomeProfileEditor } from '@/components/profile/HomeProfileEditor';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'My Home Profile',
  description:
    'Save your layout, surfaces, pets, product preferences, access instructions, Do Not Disturb Zones and Priority Zones once — and never repeat them again.',
  path: '/home-profile',
});

const highlights = [
  {
    icon: 'lock',
    title: 'Do Not Disturb Zones',
    body: 'Mark rooms, cabinets, drawers, desks or personal areas the team should not open, move or enter.',
  },
  {
    icon: 'star',
    title: 'Priority Zones',
    body: 'Choose up to three areas that get attention first on every single visit.',
  },
  {
    icon: 'refresh',
    title: 'Cleaning Memory',
    body: 'Past plans and preferences stay in place, so a repeat visit never starts from a blank form.',
  },
];

export default function HomeProfilePage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="My Home Profile"
              title="Explain your home once. We carry it forward."
              lede="Surfaces, pets, sensitivities, access, no-entry areas and the rooms that matter most — recorded once and applied to every appointment."
            />
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-line bg-white/85 p-5 backdrop-blur-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/50 text-accent-deep">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <p className="mt-4 text-[15px] font-medium text-ink">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0" id="preferences">
        <Container>
          <HomeProfileEditor />
        </Container>
      </Section>

      <Section tone="pearl">
        <Container narrow>
          <Reveal>
            <Note title="Privacy in plain language">
              Everything in this editor is stored on your device until you create an
              account. When accounts are connected, profile data is restricted to the
              team assigned to your appointment, alarm and lockbox codes are collected
              through a separate secure field rather than a free-text box, and photo
              permission stays off until you switch it on. Read the{' '}
              <a className="link-underline" href="/privacy">
                privacy policy
              </a>{' '}
              for the full detail.
            </Note>
          </Reveal>
          <Reveal className="mt-8">
            <div className="flex flex-wrap gap-3">
              <Button href="/booking">Book with this profile</Button>
              <Button href="/customer-dashboard" variant="secondary">
                Open my dashboard
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
