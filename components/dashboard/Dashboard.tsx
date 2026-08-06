'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, Select, TextArea, ToggleChip } from '@/components/ui/Form';
import {
  AnimatedCheck,
  EmptyState,
  SuccessNote,
  ToastStack,
  useToasts,
} from '@/components/ui/States';
import { Badge, Note, PlaceholderTag } from '@/components/ui/Primitives';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { cn, currency, formatDuration } from '@/lib/utils';

/**
 * DEMONSTRATION DATA
 * The dashboard is a working mockup. Every appointment, message and invoice
 * below is sample content so the layout, states and flows can be reviewed
 * before the account backend is connected.
 */
const upcoming = [
  {
    id: 'LN-482910',
    service: 'Recurring Cleaning',
    date: 'Thursday, 14 May',
    window: '10:00am – 12:00pm arrival',
    mode: 'Quiet Clean',
    rooms: 6,
    addOns: ['Bed-linen change'],
    total: 168,
    status: 'Confirmed',
  },
  {
    id: 'LN-482977',
    service: 'Deep Cleaning',
    date: 'Saturday, 7 June',
    window: '8:00am – 10:00am arrival',
    mode: 'Deep Restore',
    rooms: 8,
    addOns: ['Oven interior', 'Interior windows'],
    total: 386,
    status: 'Awaiting confirmation',
  },
];

const previous = [
  { id: 'LN-479200', service: 'Recurring Cleaning', date: '30 April', duration: 145, total: 168, rating: 5 },
  { id: 'LN-476114', service: 'Recurring Cleaning', date: '16 April', duration: 152, total: 168, rating: 5 },
  { id: 'LN-472880', service: 'Guest Ready visit', date: '2 April', duration: 168, total: 192, rating: 4 },
  { id: 'LN-469015', service: 'Deep Cleaning', date: '12 March', duration: 320, total: 358, rating: 5 },
];

const savedPlans = [
  { id: 'plan-1', name: 'Everyday plan', rooms: 6, tasks: 1, frequency: 'Every two weeks' },
  { id: 'plan-2', name: 'Guest-ready plan', rooms: 5, tasks: 3, frequency: 'On request' },
  { id: 'plan-3', name: 'Seasonal deep plan', rooms: 8, tasks: 5, frequency: 'Twice a year' },
];

const messages = [
  {
    id: 'm1',
    from: 'LumaNest team',
    time: '30 April, 2:14pm',
    body: 'Visit complete. The guest bathroom fan cover was loose, so we left it in place rather than removing it — noted in your report.',
  },
  {
    id: 'm2',
    from: 'You',
    time: '28 April, 9:02am',
    body: 'Please skip the office this visit — I will be on calls all morning.',
  },
  {
    id: 'm3',
    from: 'LumaNest team',
    time: '28 April, 9:20am',
    body: 'Noted. We will leave the office closed and schedule vacuuming for after 11am.',
  },
];

const invoices = [
  { id: 'INV-2051', date: '30 April', amount: 168, status: 'Paid' },
  { id: 'INV-2043', date: '16 April', amount: 168, status: 'Paid' },
  { id: 'INV-2019', date: '2 April', amount: 192, status: 'Paid' },
];

const report = {
  id: 'LN-479200',
  service: 'Recurring Cleaning',
  completedAt: '30 April, 1:47pm',
  duration: 145,
  rooms: [
    { name: 'Kitchen', done: true, notes: 'Counters, sink, stovetop, cabinet fronts, floor.' },
    { name: 'Bathrooms (2)', done: true, notes: 'Full clean, glass descaled in the primary shower.' },
    { name: 'Bedrooms (3)', done: true, notes: 'Beds made, surfaces dusted, floors vacuumed.' },
    { name: 'Living room', done: true, notes: 'Upholstery vacuumed, surfaces cleared and dusted.' },
    { name: 'Entryway', done: true, notes: 'Door, handles, mat and floor.' },
    { name: 'Office', done: false, notes: 'Marked Do Not Disturb for this visit at your request.' },
  ],
  addOns: [{ name: 'Bed-linen change', done: true }],
  teamNotes:
    'The guest bathroom fan cover is loose. We left it alone rather than removing it. The kitchen grout is holding up well since the deep clean in March.',
  incomplete: ['Office — Do Not Disturb Zone for this visit'],
  recommendations: [
    'Consider adding baseboards to the rotation next visit.',
    'The oven would benefit from an interior clean before the holidays.',
  ],
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar' },
  { id: 'report', label: 'Cleaning report', icon: 'document' },
  { id: 'plans', label: 'Saved plans', icon: 'star' },
  { id: 'messages', label: 'Messages', icon: 'chat' },
  { id: 'billing', label: 'Billing', icon: 'lock' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function Dashboard() {
  const [tab, setTab] = useState<TabId>('overview');
  const [instructions, setInstructions] = useState('');
  const [guestReady, setGuestReady] = useState(false);
  const [tip, setTip] = useState('0');
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const reduce = useReducedMotion();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div>
          <p className="eyebrow">Customer dashboard</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Welcome back.</h1>
          <p className="mt-2 text-[15px] text-muted">
            Your next visit is {upcoming[0].date}, {upcoming[0].window.toLowerCase()}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlaceholderTag>Demonstration account</PlaceholderTag>
          <Badge tone="mint">LumaCare · Consistent Home</Badge>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="mt-6">
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((item) => (
            <li key={item.id} className="flex-none">
              <button
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm transition-all duration-300',
                  tab === item.id
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-white text-muted hover:border-sage hover:text-ink',
                )}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          {tab === 'overview' ? (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-6">
                <Card title="Next appointment">
                  <AppointmentCard
                    appointment={upcoming[0]}
                    onReschedule={() => push('Reschedule requested', 'Members get priority access to alternate windows.')}
                    onCancel={() => push('Cancellation started', 'Notice-period terms are shown before it is final.')}
                  />
                  <div className="mt-5 space-y-4">
                    <ToggleChip
                      checked={guestReady}
                      onChange={(next) => {
                        setGuestReady(next);
                        if (next)
                          push(
                            'Guest-Ready Mode applied',
                            'Entry, guest bath, kitchen and living room move to the front of this visit.',
                          );
                      }}
                      label="Convert this visit to Guest-Ready Mode"
                      hint="Prioritizes entry, guest bathroom, kitchen, living room, fresh linens and presentation details."
                      icon={<Icon name="star" size={18} />}
                    />
                    <Field label="Add instructions for this visit" htmlFor="visit-instructions">
                      <TextArea
                        id="visit-instructions"
                        value={instructions}
                        onChange={(event) => setInstructions(event.target.value)}
                        placeholder="Please skip the office — I will be on calls until noon."
                      />
                    </Field>
                    <Button
                      size="sm"
                      onClick={() => push('Instructions saved', 'The assigned team sees these before arrival.')}
                    >
                      Save instructions
                    </Button>
                  </div>
                </Card>

                <Card title="Cleaning history">
                  <HistoryChart />
                </Card>
              </div>

              <div className="space-y-6">
                <Card title="Membership status">
                  <p className="font-display text-2xl text-ink">Consistent Home</p>
                  <p className="mt-1 text-sm text-muted">
                    Every two weeks · next billing date to be confirmed at launch
                  </p>
                  <dl className="mt-5 space-y-2 text-sm">
                    <Row label="Visits this quarter" value="6 of 6 scheduled" />
                    <Row label="Rotating detail focus" value="Cabinet fronts" />
                    <Row label="Priority rescheduling" value="Active" />
                  </dl>
                  <Button href="/membership" variant="secondary" size="sm" className="mt-5">
                    Manage membership
                  </Button>
                </Card>

                <Card title="Home profile">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2 text-ink/85">
                      <Icon name="lock" size={16} className="text-accent" />
                      2 Do Not Disturb Zones set
                    </li>
                    <li className="flex items-center gap-2 text-ink/85">
                      <Icon name="star" size={16} className="text-accent" />
                      Priority Zones: kitchen, entry, primary bath
                    </li>
                    <li className="flex items-center gap-2 text-ink/85">
                      <Icon name="leaf" size={16} className="text-accent" />
                      Fragrance-free products
                    </li>
                    <li className="flex items-center gap-2 text-ink/85">
                      <Icon name="pet" size={16} className="text-accent" />
                      One pet · escape risk noted
                    </li>
                  </ul>
                  <Button href="/home-profile" variant="secondary" size="sm" className="mt-5">
                    Edit home profile
                  </Button>
                </Card>

                <Card title="Need something?">
                  <div className="grid gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => push('Issue report started', 'Support responds within the window in our terms.')}
                    >
                      Report an issue
                    </Button>
                    <Button href="/contact" variant="ghost" size="sm">
                      Contact support
                    </Button>
                    <Button href="/contact#emergency" variant="ghost" size="sm">
                      Request an emergency clean
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {tab === 'appointments' ? (
            <div className="space-y-6">
              <Card title="Upcoming appointments">
                <div className="space-y-4">
                  {upcoming.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onReschedule={() => push('Reschedule requested', `Appointment ${appointment.id}`)}
                      onCancel={() => push('Cancellation started', `Appointment ${appointment.id}`)}
                    />
                  ))}
                </div>
              </Card>

              <Card title="Previous appointments">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th scope="col" className="py-3 font-medium">Date</th>
                        <th scope="col" className="py-3 font-medium">Service</th>
                        <th scope="col" className="py-3 font-medium">Duration</th>
                        <th scope="col" className="py-3 font-medium">Total</th>
                        <th scope="col" className="py-3 font-medium">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previous.map((visit) => (
                        <tr key={visit.id} className="border-b border-line/70">
                          <td className="py-3.5 text-ink">{visit.date}</td>
                          <td className="py-3.5 text-muted">{visit.service}</td>
                          <td className="py-3.5 text-muted">{formatDuration(visit.duration)}</td>
                          <td className="py-3.5 text-ink">{currency(visit.total)}</td>
                          <td className="py-3.5 text-muted">
                            <span className="sr-only">{visit.rating} out of 5</span>
                            <span aria-hidden="true">{'★'.repeat(visit.rating)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'report' ? (
            <div className="space-y-6">
              <Card title={`Completed cleaning report · ${report.id}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <AnimatedCheck size={28} />
                  <div>
                    <p className="text-[15px] font-medium text-ink">
                      {report.service} completed {report.completedAt}
                    </p>
                    <p className="text-sm text-muted">
                      Time on site: {formatDuration(report.duration)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  {report.rooms.map((room) => (
                    <div
                      key={room.name}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-pearl/35 p-4"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full',
                          room.done ? 'bg-accent text-white' : 'bg-champagne text-ink',
                        )}
                        aria-hidden="true"
                      >
                        {room.done ? (
                          <svg width="11" height="9" viewBox="0 0 12 9">
                            <path d="M1 4.6 4.4 8 11 1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="10" height="2" viewBox="0 0 10 2">
                            <path d="M0 1h10" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className="text-[15px] font-medium text-ink">
                          {room.name}
                          <span className="ml-2 text-sm font-normal text-muted">
                            {room.done ? 'Completed' : 'Not serviced'}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm text-muted">{room.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-line p-5">
                    <p className="eyebrow mb-3">Add-ons completed</p>
                    <ul className="space-y-2 text-sm text-ink/85">
                      {report.addOns.map((addOn) => (
                        <li key={addOn.name} className="flex items-center gap-2">
                          <Icon name="check" size={15} className="text-accent" />
                          {addOn.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-line p-5">
                    <p className="eyebrow mb-3">Could not be completed</p>
                    <ul className="space-y-2 text-sm text-muted">
                      {report.incomplete.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-line bg-luma-gradient p-5">
                  <p className="eyebrow mb-2">Notes from the team</p>
                  <p className="text-[15px] leading-relaxed text-ink/85">{report.teamNotes}</p>
                </div>

                <div className="mt-6 rounded-2xl border border-line p-5">
                  <p className="eyebrow mb-3">Recommended future maintenance</p>
                  <ul className="space-y-2 text-sm text-ink/85">
                    {report.recommendations.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-sage" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="eyebrow">Before and after photos</p>
                    <Badge tone="outline">Permission required</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <EditorialImage id="dashboard-report" aspect="aspect-[4/3]" />
                    <div className="flex flex-col justify-center rounded-3xl border border-dashed border-line bg-pearl/40 p-5">
                      <p className="text-sm font-medium text-ink">
                        Photos are off by default
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        We only photograph completed rooms when you have switched photo
                        permission on, and we never publish or share customer-home
                        photographs without separate written consent.
                      </p>
                      <Button href="/home-profile#preferences" variant="quiet" className="mt-3">
                        Manage photo permission →
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-line p-5">
                  <Field label="Leave feedback on this visit" htmlFor="feedback">
                    <TextArea
                      id="feedback"
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="What went well, and what should we adjust next time?"
                    />
                  </Field>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFeedbackSent(true);
                        push('Feedback recorded', 'It becomes part of the plan we follow next visit.');
                      }}
                    >
                      Send feedback
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => push('Correction visit requested', 'Support will confirm the nearest window.')}
                    >
                      Request a correction visit
                    </Button>
                  </div>
                  {feedbackSent ? (
                    <div className="mt-4">
                      <SuccessNote
                        title="Thank you"
                        body="Your notes are attached to this appointment and to your saved plan."
                      />
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'plans' ? (
            <Card title="Saved cleaning plans">
              <div className="grid gap-4 sm:grid-cols-3">
                {savedPlans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-line bg-pearl/35 p-5">
                    <p className="font-display text-xl text-ink">{plan.name}</p>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <Row label="Rooms" value={`${plan.rooms}`} />
                      <Row label="Tasks" value={`${plan.tasks}`} />
                      <Row label="Frequency" value={plan.frequency} />
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button href="/booking" size="sm">
                        Book
                      </Button>
                      <Button href="/build-your-clean" variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Note className="mt-6" title="Cleaning Memory">
                Saved plans carry your room selections, per-room priorities, add-ons and
                household preferences. Booking from a saved plan takes two taps.
              </Note>
            </Card>
          ) : null}

          {tab === 'messages' ? (
            <Card title="Messages">
              {messages.length === 0 ? (
                <EmptyState
                  icon="chat"
                  title="No messages yet"
                  body="Notes from your team and anything you send us will appear here."
                />
              ) : (
                <ul className="space-y-3">
                  {messages.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        'rounded-2xl border p-4',
                        message.from === 'You'
                          ? 'border-line bg-white'
                          : 'border-sage/60 bg-mint/25',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-ink">{message.from}</p>
                        <p className="text-xs text-muted">{message.time}</p>
                      </div>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink/85">
                        {message.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5">
                <Field label="Send a message" htmlFor="new-message">
                  <TextArea id="new-message" placeholder="Anything the team should know before the next visit?" />
                </Field>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => push('Message sent', 'Messaging connects to the support inbox at launch.')}
                >
                  Send message
                </Button>
              </div>
            </Card>
          ) : null}

          {tab === 'billing' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Payment methods">
                <div className="rounded-2xl border border-line bg-pearl/35 p-5">
                  <p className="text-[15px] font-medium text-ink">Card ending ••••  (placeholder)</p>
                  <p className="mt-1 text-sm text-muted">
                    Payment methods are stored with the payment provider, not on
                    LumaNest servers. Card details never pass through this page.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => push('Payment method update', 'Opens the provider’s secure form at launch.')}
                >
                  Update payment method
                </Button>

                <div className="mt-6">
                  <Field label="Add a tip to your last visit" htmlFor="tip" hint="Never expected. Always optional.">
                    <Select id="tip" value={tip} onChange={(event) => setTip(event.target.value)}>
                      <option value="0">No tip</option>
                      <option value="10">$10</option>
                      <option value="20">$20</option>
                      <option value="30">$30</option>
                    </Select>
                  </Field>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={tip === '0'}
                    onClick={() => push('Tip added', `${currency(Number(tip))} added to your last visit.`)}
                  >
                    Add tip
                  </Button>
                </div>
              </Card>

              <Card title="Invoices">
                <ul className="space-y-3">
                  {invoices.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-ink">{invoice.id}</p>
                        <p className="text-sm text-muted">
                          {invoice.date} · {currency(invoice.amount)} · {invoice.status}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => push('Invoice download', 'PDF generation connects at launch.')}
                      >
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
}: {
  appointment: (typeof upcoming)[number];
  onReschedule: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-luma-gradient p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl text-ink">{appointment.service}</p>
          <p className="mt-1 text-sm text-muted">
            {appointment.date} · {appointment.window}
          </p>
        </div>
        <Badge tone={appointment.status === 'Confirmed' ? 'mint' : 'champagne'}>
          {appointment.status}
        </Badge>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Row label="Reference" value={appointment.id} />
        <Row label="Mode" value={appointment.mode} />
        <Row label="Rooms" value={`${appointment.rooms}`} />
        <Row label="Estimated total" value={currency(appointment.total)} />
      </dl>

      {appointment.addOns.length ? (
        <p className="mt-3 text-sm text-muted">
          Add-ons: {appointment.addOns.join(', ')}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onReschedule}>
          Reschedule
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function HistoryChart() {
  const reduce = useReducedMotion();
  const data = [
    { month: 'Dec', visits: 2 },
    { month: 'Jan', visits: 2 },
    { month: 'Feb', visits: 3 },
    { month: 'Mar', visits: 3 },
    { month: 'Apr', visits: 2 },
    { month: 'May', visits: 1 },
  ];
  const max = Math.max(...data.map((item) => item.visits));

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.map((item, index) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-xl bg-gradient-to-t from-sage to-mint"
              initial={reduce ? false : { height: 0 }}
              animate={{ height: `${(item.visits / max) * 100}%` }}
              transition={{ duration: 0.7, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
              style={{ minHeight: 8 }}
            />
            <span className="text-xs text-muted">{item.month}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        13 visits in the last six months · demonstration data
      </p>
    </div>
  );
}
