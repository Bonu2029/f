import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'Privacy Policy',
  description:
    'What information LumaNest collects, why, how long it is kept, who can see it, and the choices you have — including photo permission and access details.',
  path: '/privacy',
});

const sections = [
  {
    title: 'What we collect',
    body: [
      'Contact details: name, email address, phone number and service address.',
      'Home details: rooms, surfaces, flooring, appliances, pets, product preferences and any sensitivity notes you choose to provide.',
      'Access details: entry method, parking notes and the alarm process. Alarm and lockbox codes are collected through a separate secure field, never a free-text box.',
      'Appointment records: plans, add-ons, completed checklists, team notes and messages.',
      'Payment records: handled by our payment provider. LumaNest does not store full card numbers.',
      'Site usage: basic, aggregate analytics about how pages are used. No third-party advertising trackers.',
    ],
  },
  {
    title: 'Why we collect it',
    body: [
      'To provide the cleaning service you booked, following the preferences you set.',
      'To confirm appointments, send arrival updates and deliver completed reports.',
      'To keep a record of what was done, so a later question can be answered accurately.',
      'To process payment and issue invoices.',
      'To improve procedures and training based on feedback.',
    ],
  },
  {
    title: 'Who can see it',
    body: [
      'The team assigned to your appointment sees the plan, preferences, access notes and any Do Not Disturb Zones.',
      'Support and scheduling staff see what they need to manage your account and appointments.',
      'Service providers — payment, email, SMS, storage — process data on our behalf under contract and may not use it for their own purposes.',
      'We do not sell customer information, and we do not share it with advertisers.',
    ],
  },
  {
    title: 'Photographs',
    body: [
      'Photo permission is off by default and stays off until you enable it in your profile.',
      'When enabled, photographs are limited to the completed areas you approve, and are attached to your report only.',
      'Nothing is published, shared or used in marketing without separate written consent.',
      'You may withdraw permission at any time and request deletion of existing photographs.',
      'Photos submitted with a quote request are used only to scope the request and are deleted within 30 days unless you book, in which case they are kept with the appointment record.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'Account and appointment records are kept while your account is active and for the period required for tax and legal purposes afterwards.',
      'Access details are removed when a plan ends or on request.',
      'Quote-request photographs are deleted within 30 days unless attached to a booking.',
      'You can request deletion of your account and associated records at any time, subject to records we are legally required to retain.',
    ],
  },
  {
    title: 'Security',
    body: [
      'Access to customer records is restricted by role, and access to a specific home’s details is limited to the assigned team and scheduling staff.',
      'Sensitive access information is stored separately from ordinary appointment notes.',
      'Payment details are held by a PCI-compliant provider, not on LumaNest systems.',
      'API keys and credentials are held server-side only and never included in front-end code.',
      'No system is perfectly secure, and we will not claim otherwise. We will notify affected customers promptly if a breach occurs.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'Review and edit your home profile at any time.',
      'Turn photo permission on or off.',
      'Choose your communication channel, including dashboard-only.',
      'Unsubscribe from the newsletter in one click without affecting service messages.',
      'Request a copy of your data, or ask us to correct or delete it.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container narrow>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Privacy"
              title="What we collect, and what we do with it."
              lede="Written to be read. If a sentence here needs a lawyer to interpret, we have failed at the point of it."
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container narrow>
          <Reveal>
            <Note title="Draft policy">
              This policy is a working draft written to match how the site is designed.
              It must be reviewed by qualified legal counsel and adjusted for your
              jurisdiction — including any state or national privacy law that applies —
              before launch.
            </Note>
          </Reveal>

          <div className="mt-12 space-y-12">
            {sections.map((section, index) => (
              <Reveal key={section.title} delay={index * 0.04}>
                <section>
                  <h2 className="text-2xl">{section.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {section.body.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                        <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-sage" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ))}

            <Reveal>
              <section>
                <h2 className="text-2xl">Contact about privacy</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  Questions, access requests and deletion requests can be sent to{' '}
                  <a href={`mailto:${site.email}`} className="link-underline">
                    {site.email}
                  </a>
                  . These are placeholder contact details until real business
                  information is supplied.
                </p>
              </section>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
