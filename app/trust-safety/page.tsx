import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import { CheckList, Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'Trust & Safety',
  description:
    'How LumaNest screens and trains its team, handles home access and keys, protects customer privacy, manages photography permission and responds to damage reports.',
  path: '/trust-safety',
});

const sections = [
  {
    id: 'screening',
    icon: 'users',
    title: 'Team screening',
    body: 'Every person who enters a customer home completes identity verification and a background screening before their first visit. Screening is repeated on a recurring schedule.',
    points: [
      'Identity and right-to-work verification',
      'Criminal background screening through a third-party provider',
      'Reference checks for prior cleaning or hospitality work',
      'Written agreement covering conduct, privacy and home access',
    ],
  },
  {
    id: 'training',
    icon: 'document',
    title: 'Training',
    body: 'Cleaning is a craft with real risk of damage. Training covers surfaces, chemistry and the situations where the right answer is to stop and ask.',
    points: [
      'Surface and finish identification, and which products are unsafe on each',
      'Dilution, dwell time and ventilation practices',
      'Do Not Disturb Zones and privacy handling',
      'What to do when something is already damaged, and how to document it',
      'Pet safety, door discipline and escape-risk procedures',
    ],
  },
  {
    id: 'insurance',
    icon: 'shield',
    title: 'Insurance',
    body: 'LumaNest carries business liability coverage. Certificate details are available on request for property managers and building requirements.',
    points: [
      'General liability coverage for service work in customer homes',
      'Certificate of insurance available on request',
      'Coverage details confirmed with our carrier before launch',
    ],
  },
  {
    id: 'access',
    icon: 'key',
    title: 'Home access and key handling',
    body: 'Access details are treated as sensitive information, not as ordinary appointment notes.',
    points: [
      'Access notes are visible only to the team assigned to your appointment',
      'Alarm and lockbox codes are collected through a separate secure field, never a free-text box',
      'Physical keys are labelled by reference number rather than address, and logged in and out',
      'Access permissions end when a recurring plan ends or an appointment is cancelled',
      'You can change or revoke access details from your profile at any time',
    ],
  },
  {
    id: 'privacy',
    icon: 'lock',
    title: 'Customer privacy',
    body: 'The team sees what it needs to complete your plan and nothing more.',
    points: [
      'Profile data is restricted to the assigned team for the scheduled visit',
      'Do Not Disturb Zones are never opened, moved or entered',
      'Documents, mail, screens and personal items are not read, moved or photographed',
      'Staff are not permitted to share customer information or addresses outside the company',
    ],
  },
  {
    id: 'photography',
    icon: 'camera',
    title: 'Photography permissions',
    body: 'Photo permission is off by default and stays off until you switch it on.',
    points: [
      'No photographs are taken without your permission recorded in your profile',
      'Photos are limited to the areas you approve and are attached to your report only',
      'Nothing is published, shared or used in marketing without separate written consent',
      'Permission can be withdrawn at any time, and existing photos deleted on request',
    ],
  },
  {
    id: 'products',
    icon: 'leaf',
    title: 'Product safety',
    body: 'We follow your product preferences exactly and document what was used.',
    points: [
      'Standard, eco-conscious, fragrance-free or customer-supplied products',
      'Specific ingredient avoid lists recorded on your profile',
      'Products stored and transported according to their safety instructions',
      'We do not assess sensitivities, diagnose reactions or make health claims',
    ],
  },
  {
    id: 'pets',
    icon: 'pet',
    title: 'Pet procedures',
    body: 'Your pet profile drives the practical decisions during a visit.',
    points: [
      'Escape-risk animals mean doors and gates stay closed throughout',
      'Safe rooms are respected and not entered unless you have said otherwise',
      'Product restrictions around pet areas are followed',
      'If an animal is distressed, we stop and contact you rather than pressing on',
    ],
  },
  {
    id: 'damage',
    icon: 'document',
    title: 'Damage reporting',
    body: 'If something breaks, you hear it from us first.',
    points: [
      'The team reports damage before leaving the home, with photos',
      'You receive a written notice the same day',
      'We describe what happened plainly rather than minimizing it',
      'Resolution options are discussed with you directly, and escalated to our insurer where appropriate',
    ],
  },
  {
    id: 'satisfaction',
    icon: 'refresh',
    title: 'Satisfaction process',
    body: 'If a visit missed the mark, we would rather fix it than debate it.',
    points: [
      'Report an issue from your dashboard within the window stated in our terms',
      'We review the completed checklist and the team notes',
      'Where a correction is appropriate, we schedule a return visit for the affected areas',
      'Where it is not, we explain why in writing rather than going quiet',
    ],
  },
  {
    id: 'communication',
    icon: 'chat',
    title: 'Communication standards',
    body: 'Predictable, low-pressure and in the channel you chose.',
    points: [
      'Arrival updates in your preferred format, including text-only',
      'No doorbell when Quiet Clean is set',
      'Questions during a visit only when the answer changes what we do',
      'A completed report after every visit, whether or not anything went wrong',
    ],
  },
];

export default function TrustSafetyPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="Trust and safety"
                title="Letting someone into your home is a real decision."
                lede="We use documented procedures designed to reduce risk and protect customer privacy. Below is what those procedures actually are, in plain language."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/contact">Ask a specific question</Button>
                <Button href="/home-profile" variant="secondary">
                  Set my privacy preferences
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="trust-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <Reveal>
            <Note title="What we will not say">
              You will not find “100% safe” or “zero risk” on this page. No service can
              promise that. What we can promise is that our procedures are written down,
              followed, and explained to you before anything happens in your home.
            </Note>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {sections.map((section, index) => (
              <Reveal key={section.id} delay={(index % 2) * 0.06}>
                <section id={section.id} className="h-full rounded-[2rem] border border-line bg-white p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/45 text-accent-deep">
                    <Icon name={section.icon} size={20} />
                  </span>
                  <h2 className="mt-5 text-2xl">{section.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{section.body}</p>
                  <CheckList items={section.points} className="mt-5" />
                </section>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="pearl" id="emergency">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <SectionHeading
                eyebrow="If something goes wrong"
                title="Emergency contact process"
                lede="During a visit, the assigned team can reach a supervisor immediately. You can too."
              />
              <ol className="mt-8 space-y-4">
                {[
                  'Call the support line during business hours, or use the urgent option in your dashboard at any time.',
                  'Describe what happened and where. Photos help but are not required.',
                  'A supervisor acknowledges the report and tells you the next step and its timing.',
                  'For anything involving injury, fire, gas or a security concern, contact emergency services first. We are not a substitute for them.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white font-display text-sm text-accent">
                      {index + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-ink/85">{step}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-muted">
                Support line:{' '}
                <a href={site.phoneHref} className="link-underline">
                  {site.phone}
                </a>{' '}
                (placeholder number) · {site.hours}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-[2rem] border border-line bg-white p-7">
                <h2 className="text-2xl">Before any visit, please secure</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                  This is standard practice with any service in your home, and it is not
                  a comment on anyone. It simply removes the question entirely.
                </p>
                <CheckList
                  className="mt-6"
                  items={[
                    'Cash, jewelry and small valuables',
                    'Prescription and over-the-counter medications',
                    'Passports, financial documents and legal paperwork',
                    'Firearms, secured and stored per local law',
                    'Highly personal items you would rather nobody see',
                    'Loose or fragile items on surfaces we will clean',
                  ]}
                />
                <Note className="mt-6" title="Do Not Disturb Zones">
                  Anything you would rather we simply never approach can be marked as a
                  Do Not Disturb Zone — a room, a cabinet, a drawer or a desk. The team
                  sees it before the visit and does not open, move or enter it.
                </Note>
                <Button href="/home-profile#zones" className="mt-6">
                  Set my Do Not Disturb Zones
                </Button>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
