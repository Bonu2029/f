import Link from 'next/link';
import {
  BookOpen,
  CalendarCheck,
  Clock,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  PhoneCall,
  PhoneForwarded,
  UserPlus,
} from 'lucide-react';
import { PLANS, brand, formatPrice } from '@afd/shared';
import { getFounderStats } from '@/server/founder';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { CallDemo } from '@/components/marketing/call-demo';
import { DashboardPreview } from '@/components/marketing/dashboard-preview';
import { FaqList } from '@/components/marketing/faq';

export const revalidate = 30;

export default async function HomePage() {
  const stats = await getFounderStats().catch(() => null);
  const founderAvailable = Boolean(stats && !stats.soldOut);
  const plan = founderAvailable ? PLANS.founder : PLANS.standard;

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            {founderAvailable && stats && (
              <Badge tone="brand" className="mb-5 py-1">
                <span className="size-1.5 rounded-full bg-brand-600" aria-hidden />
                {stats.remaining} of {stats.total} Founding Member spots left
              </Badge>
            )}

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Never miss another customer call.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              Your AI receptionist answers calls, talks naturally with customers, captures leads and
              books appointments — even when you&rsquo;re on a roof, under a sink or driving between
              jobs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  {founderAvailable ? 'Claim Founding Price — $20/mo' : 'Get started'}
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#demo">Hear how a call goes</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-ink-subtle">
              {founderAvailable
                ? `Only ${plan.capacity} Founding Member spots available. ${formatPrice(plan.priceCents)}/month, ${plan.includedMinutes} AI minutes included.`
                : `${formatPrice(plan.priceCents)}/month · ${plan.includedMinutes} AI minutes included · cancel anytime.`}
            </p>
          </div>

          <div className="lg:pl-6">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              Set up your front desk in an afternoon
            </h2>
            <p className="mt-3 text-ink-muted">
              You train it the same way you would train a new hire — by telling it about your
              business. No scripts to write, no phone system to replace.
            </p>
          </div>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Tell us about your business',
                body: 'Have a short conversation with the training assistant. It turns what you say into services, pricing, hours and policies you can edit.',
              },
              {
                step: '2',
                title: 'Choose your receptionist',
                body: 'Pick a name, a voice and a greeting. Set the rules — what it can quote, what it must never promise, when to hand a call to you.',
              },
              {
                step: '3',
                title: 'Connect your phone',
                body: 'Get a new AI number in your area code, or forward your existing business line to it. Keep the number your customers already know.',
              },
              {
                step: '4',
                title: 'Let it answer',
                body: 'Calls get answered around the clock. Leads, transcripts, summaries and booked appointments show up in your dashboard.',
              },
            ].map((s) => (
              <li key={s.step}>
                <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                  {s.step}
                </span>
                <h3 className="mt-4 font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Interactive demo                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section id="demo" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              This is what a missed call turns into
            </h2>
            <p className="mt-3 text-ink-muted">
              Watch a typical HVAC call from first hello to booked appointment. Every step on the
              right — checking the service area, creating the lead, booking the slot — is a real
              action your receptionist takes during the call, not a summary written afterwards.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-muted">
              {[
                'Understands why the customer is calling',
                'Answers questions from your own business knowledge',
                'Checks coverage before promising anything',
                'Only offers appointment times that are genuinely open',
              ].map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <CallDemo />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="features" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              Everything a good front desk does
            </h2>
            <p className="mt-3 text-ink-muted">
              Built for roofing, HVAC, plumbing, cleaning, landscaping, electrical and every other
              local service business that lives on the phone.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: PhoneCall,
                title: 'AI phone answering',
                body: 'Natural back-and-forth conversation. It handles interruptions, accents and callers who change their mind mid-sentence.',
              },
              {
                icon: UserPlus,
                title: 'Lead capture',
                body: 'Name, number, address, what they need and how urgent it is — captured during the call, scored with rules you can read.',
              },
              {
                icon: CalendarCheck,
                title: 'Appointment booking',
                body: 'Connects to Google Calendar or your own availability. It checks before it offers, so nothing gets double-booked.',
              },
              {
                icon: BookOpen,
                title: 'Business knowledge',
                body: 'Teach it your services, prices, policies and service area. It answers from that, and says it will check when it does not know.',
              },
              {
                icon: PhoneForwarded,
                title: 'Human transfer',
                body: 'Emergencies and callers who ask for you get put straight through to whichever number you choose.',
              },
              {
                icon: ImageIcon,
                title: 'SMS & photo requests',
                body: 'It can text a secure upload link mid-call so you see the leaking roof before you quote it.',
              },
              {
                icon: FileText,
                title: 'Call summaries',
                body: 'A short structured summary of every call — reason, customer, location, outcome — plus the full searchable transcript.',
              },
              {
                icon: Clock,
                title: '24/7 availability',
                body: 'After hours, weekends, during a job. It follows the rules you set for each of those situations.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="pt-5">
                  <Icon className="size-5 text-brand-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing teaser                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            {founderAvailable ? 'Founding Member pricing' : 'Simple monthly pricing'}
          </h2>
          <p className="mt-3 text-ink-muted">{plan.blurb}</p>

          <div className="mt-8 flex items-baseline justify-center gap-3">
            {plan.compareAtCents && (
              <span className="text-2xl text-ink-faint line-through">
                {formatPrice(plan.compareAtCents)}
              </span>
            )}
            <span className="text-5xl font-semibold tracking-tight text-ink">
              {formatPrice(plan.priceCents)}
            </span>
            <span className="text-ink-subtle">/month</span>
          </div>

          <p className="mt-3 text-sm text-ink-subtle">
            {plan.includedMinutes} AI minutes included · additional minutes{' '}
            {formatPrice(plan.overageCentsPerMinute)}/minute
          </p>

          {founderAvailable && stats && (
            <p className="mt-2 text-sm font-medium text-brand-700">
              {stats.remaining} of {stats.total} spots remaining
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">{founderAvailable ? 'Claim my Founding spot' : 'Get started'}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/pricing">See everything included</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section id="faq" className="bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Questions people ask</h2>
          <div className="mt-8">
            <FaqList />
          </div>
          <p className="mt-8 text-sm text-ink-subtle">
            Still unsure?{' '}
            <a className="font-medium text-brand-600 hover:underline" href={`mailto:${brand.contact.sales}`}>
              Email us
            </a>{' '}
            and a person will answer.
          </p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
          <MessageSquare className="size-7 text-brand-600" aria-hidden />
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Every missed call is a customer calling someone else.
          </h2>
          <Button asChild size="lg">
            <Link href="/signup">{founderAvailable ? 'Start for $20/month' : 'Get started'}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
