import type { Metadata } from 'next';
import {
  ContactForm,
  EmergencyRequest,
  PhotoQuoteRequest,
} from '@/components/site/ContactForm';
import { LocationChecker } from '@/components/site/LocationChecker';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Icon } from '@/components/ui/Icon';
import { Container, Note, Section, SectionHeading } from '@/components/ui/Primitives';
import { pageMeta } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'Contact LumaNest',
  description:
    'Reach LumaNest about a new cleaning request, an existing appointment, membership, property management, commercial cleaning or feedback.',
  path: '/contact',
});

const channels = [
  {
    icon: 'chat',
    title: 'General questions',
    body: 'Anything about services, scope or how a visit works.',
    detail: 'Reply within one business day',
  },
  {
    icon: 'calendar',
    title: 'Existing customers',
    body: 'Rescheduling, instructions for an upcoming visit, or an issue with a completed one.',
    detail: 'Same business day where possible',
  },
  {
    icon: 'users',
    title: 'Property managers',
    body: 'Multi-unit turnover, standing schedules and certificate-of-insurance requests.',
    detail: 'A named contact for your portfolio',
  },
  {
    icon: 'star',
    title: 'Partnerships',
    body: 'Realtors, building managers, hosts and local businesses.',
    detail: 'Sent to the partnerships inbox',
  },
];

export default function ContactPage() {
  return (
    <>
      <Section tone="gradient" className="pt-12 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <SectionHeading
                level={1}
                eyebrow="Contact"
                title="Talk to a person about your home."
                lede="Tell us what you need and where you are. If we cannot help, we will say so directly rather than passing you around."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <a
                  href={site.phoneHref}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white/85 p-4 backdrop-blur-sm transition-colors hover:border-accent"
                >
                  <Icon name="chat" size={20} className="text-accent" />
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{site.phone}</span>
                    <span className="block text-xs text-muted">Placeholder phone number</span>
                  </span>
                </a>
                <a
                  href={`mailto:${site.email}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white/85 p-4 backdrop-blur-sm transition-colors hover:border-accent"
                >
                  <Icon name="document" size={20} className="text-accent" />
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{site.email}</span>
                    <span className="block text-xs text-muted">Placeholder address</span>
                  </span>
                </a>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Icon name="clock" size={16} className="text-accent" />
                {site.hours}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <EditorialImage id="contact-hero" aspect="aspect-[3/2]" priority />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="plain">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
            <Reveal>
              <ContactForm />
            </Reveal>

            <div className="space-y-4">
              {channels.map((channel, index) => (
                <Reveal key={channel.title} delay={index * 0.06}>
                  <div className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex items-center gap-2.5">
                      <Icon name={channel.icon} size={18} className="text-accent" />
                      <h2 className="text-[17px] font-medium text-ink">{channel.title}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{channel.body}</p>
                    <p className="mt-2 text-xs text-accent">{channel.detail}</p>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.24}>
                <Note title="Business details">
                  Phone number, email addresses, business hours and mailing address on
                  this site are placeholders. Replace them with verified business
                  information before launch.
                </Note>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="pearl" id="photo-quote">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <PhotoQuoteRequest />
            </Reveal>
            <Reveal delay={0.08} className="lg:pt-0">
              <div id="emergency">
                <EmergencyRequest />
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Service area"
              title="Check before you write, if it is easier."
              lede="The ZIP checker gives you an immediate answer about coverage."
            />
          </Reveal>
          <Reveal className="mt-10" delay={0.05}>
            <LocationChecker />
          </Reveal>
          <Reveal className="mt-10">
            <div className="flex flex-wrap gap-3">
              <Button href="/booking">Book a cleaning</Button>
              <Button href="/faq" variant="secondary">
                Read the FAQ first
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
