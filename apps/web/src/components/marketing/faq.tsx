import { PLANS, formatPrice } from '@afd/shared';

/**
 * FAQ content. Answers are written to be accurate about what the product does
 * and does not do — including the parts that depend on the customer's own
 * phone carrier, which we cannot control.
 */
export const FAQ_ITEMS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Does this replace my existing phone number?',
    a: (
      <>
        No. You get a new AI phone number, and you keep the number your customers already know. Most
        businesses set up call forwarding from their existing line to the AI number — either for all
        calls, only calls you don&rsquo;t pick up, or only after hours. Forwarding is configured with
        your phone carrier; we give you the exact steps, but we can&rsquo;t program every carrier
        automatically.
      </>
    ),
  },
  {
    q: 'Will customers know they are talking to AI?',
    a: (
      <>
        You control the greeting, and many businesses choose to say it up front. Either way, if a
        caller asks whether they are speaking to a person, the receptionist answers truthfully and
        immediately. It will never claim to be human. Some jurisdictions require disclosure — check
        what applies to you.
      </>
    ),
  },
  {
    q: 'Can it book appointments?',
    a: (
      <>
        Yes. Connect Google Calendar and it checks real availability before offering a time, then
        creates the event. If you&rsquo;d rather not connect a calendar, set your working hours,
        appointment length and buffers and it books against those instead.
      </>
    ),
  },
  {
    q: 'Can it transfer calls to me?',
    a: (
      <>
        Yes, if you turn transfers on and give it a number. When a caller asks for a person, or
        describes something you&rsquo;ve told it to escalate, it hands the call over. If the transfer
        doesn&rsquo;t connect, it says so honestly and takes a message instead of pretending.
      </>
    ),
  },
  {
    q: 'Can I change what the AI says?',
    a: (
      <>
        Yes — greeting, name, personality, rules, prices, hours, service area, all of it. Changes
        apply to the next call. You never have to contact us to make a change.
      </>
    ),
  },
  {
    q: 'Can I change the voice?',
    a: <>Yes. Choose from the available voices, preview each one, and switch whenever you like.</>,
  },
  {
    q: 'What happens after I use all my minutes?',
    a: (
      <>
        Nothing breaks — your receptionist keeps answering. Minutes past your plan allowance are
        billed at {formatPrice(PLANS.standard.overageCentsPerMinute)} per minute. You&rsquo;ll see
        alerts at 70%, 90% and 100% so there are no surprises. Each call is rounded up to the next
        whole minute.
      </>
    ),
  },
  {
    q: 'Can I cancel?',
    a: (
      <>
        Yes, any time, from the billing portal. Your receptionist keeps working until the end of the
        period you&rsquo;ve already paid for.
      </>
    ),
  },
  {
    q: 'What happens to my Founding Member price if I cancel?',
    a: (
      <>
        The {formatPrice(PLANS.founder.priceCents)}/month rate holds for as long as your subscription
        stays continuously active. If you cancel and come back later, you rejoin at the standard
        price — and the Founding spot isn&rsquo;t returned to the pool, because &ldquo;first
        50&rdquo; should mean something.
      </>
    ),
  },
  {
    q: 'Does it record my calls?',
    a: (
      <>
        Audio recording is off. The receptionist stores a written transcript and a summary of each
        call so you can see what happened. Recording and consent laws vary by state and country — if
        you need audio recording, talk to us and get legal advice first.
      </>
    ),
  },
];

export function FaqList() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink">
            {item.q}
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink-subtle transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="mt-3 text-sm leading-relaxed text-ink-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
