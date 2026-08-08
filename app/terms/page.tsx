import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'Terms of Service',
  description:
    'Booking, scheduling, pricing, cancellation, satisfaction, liability and accessibility terms for LumaNest cleaning services.',
  path: '/terms',
});

const sections = [
  {
    id: 'services',
    title: 'The service',
    body: [
      'LumaNest provides residential and light commercial cleaning as described in the plan confirmed at booking.',
      'The scope of a visit is what appears in your confirmed plan. Work outside that scope is quoted separately before it is carried out.',
      'We may decline or stop a visit where conditions are unsafe, including biohazards, pest infestations, mold requiring remediation, or conditions requiring specialist equipment.',
    ],
  },
  {
    id: 'estimates',
    title: 'Estimates and pricing',
    body: [
      'Estimates are based on the information you provide about the property and the scope you select.',
      'The final amount changes only where the scope changes, or where the property is substantially different from the details submitted.',
      'If we find a substantial difference on arrival, we will contact you before proceeding rather than adjusting the price afterwards.',
      'Add-ons are priced individually and appear as separate lines on every estimate and invoice.',
      'All pricing shown on this website is placeholder pricing until final rates are published.',
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling and access',
    body: [
      'Appointments are booked into an arrival window rather than a fixed time.',
      'You are responsible for providing accurate access information, and for ensuring utilities are on where the service requires them.',
      'If the team cannot access the property within a reasonable time of the arrival window, a lockout fee may apply. Any such fee is stated before you confirm the booking.',
      'We do not guarantee same-day availability, and we will not promise it in order to secure a booking.',
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation and rescheduling',
    body: [
      'Appointments can be rescheduled or cancelled from your dashboard.',
      'Short-notice cancellation terms and any associated fee are shown before you confirm, and again in your confirmation email.',
      'Membership cancellation terms, including notice period and the effect on already-scheduled visits, are presented at signup and repeated on the membership page.',
      'Whether unused membership visits roll over has not been finalized and will be stated explicitly before memberships open.',
    ],
  },
  {
    id: 'satisfaction',
    title: 'Satisfaction and corrections',
    body: [
      'If something in your confirmed plan was missed, report it through your dashboard within the window stated in your confirmation.',
      'Where a correction is appropriate, we schedule a return visit covering the affected areas at no additional charge.',
      'Where we do not believe a correction is warranted, we explain the reason in writing.',
      'We do not offer a refund guarantee tied to outcomes outside our control, such as a landlord’s deposit decision.',
    ],
  },
  {
    id: 'liability',
    title: 'Damage and liability',
    body: [
      'Damage is reported to you before the team leaves the property, with photographs.',
      'LumaNest carries business liability insurance; claims are handled through our carrier where appropriate.',
      'We are not responsible for pre-existing damage, wear, or items that were already unstable, unsecured or improperly installed.',
      'We are not responsible for valuables, cash, medications or documents that were not secured before the visit, as requested on our Trust & Safety page.',
      'Nothing in these terms limits liability where the law does not allow it to be limited.',
    ],
  },
  {
    id: 'payment',
    title: 'Payment',
    body: [
      'Payment is taken through a PCI-compliant payment provider. LumaNest does not store full card details.',
      'Deposits, where taken, are applied to the final amount for the visit.',
      'Membership billing occurs on the cycle stated at signup.',
      'Tipping is never expected and is entirely optional.',
    ],
  },
  {
    id: 'conduct',
    title: 'Respect and conduct',
    body: [
      'Our team members are entitled to a safe and respectful working environment.',
      'We may end a visit and decline future service in cases of harassment, discrimination, threats or unsafe conditions.',
      'We ask that pets be secured or their location communicated before each visit.',
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    body: [
      'This website is built to be usable with a keyboard alone, with visible focus states, labelled form controls, descriptive validation messages and proper heading structure.',
      'Animation respects the operating-system reduced-motion preference throughout.',
      'Information is never conveyed by color alone.',
      'If you encounter a barrier on this site or in booking a service, contact us and we will help you complete what you were trying to do and fix the underlying issue.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <Section tone="gradient" className="pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Container narrow>
          <Reveal>
            <SectionHeading
              level={1}
              eyebrow="Terms"
              title="The agreement, without the maze."
              lede="These terms describe what we will do, what we will not do, and what happens when something goes wrong."
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="plain" className="pt-0 sm:pt-0">
        <Container narrow>
          <Reveal>
            <Note title="Draft terms">
              These terms are a working draft that matches how the service is described
              across this site. They must be reviewed by qualified legal counsel and
              adapted to your jurisdiction before launch. Fee amounts, notice periods
              and claim windows are intentionally left unspecified until the business
              sets them.
            </Note>
          </Reveal>

          <nav aria-label="Terms sections" className="mt-10 flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-sage hover:text-ink"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <div className="mt-12 space-y-12">
            {sections.map((section, index) => (
              <Reveal key={section.id} delay={index * 0.03}>
                <section id={section.id} className="scroll-mt-28">
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
                <h2 className="text-2xl">Questions about these terms</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  Write to{' '}
                  <a href={`mailto:${site.supportEmail}`} className="link-underline">
                    {site.supportEmail}
                  </a>{' '}
                  — a placeholder address until real business details are supplied.
                </p>
              </section>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
