import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Container, Note, Section } from '@/components/ui/Primitives';
import { Reveal } from '@/components/motion/Reveal';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Customer Dashboard',
  description:
    'Appointments, saved plans, cleaning reports, messages, membership status and invoices in one private place.',
  path: '/customer-dashboard',
});

export default function DashboardPage() {
  return (
    <Section tone="plain" className="pt-10 sm:pt-14">
      <Container>
        <Dashboard />
        <Reveal className="mt-10">
          <Note title="About this preview">
            This dashboard is a working mockup with demonstration data. Once accounts
            and authentication are connected, it becomes a private, signed-in area:
            appointments, reports and messages are visible only to the account holder,
            and payment details stay with the payment provider rather than on LumaNest
            servers.
          </Note>
        </Reveal>
      </Container>
    </Section>
  );
}
