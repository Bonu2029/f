import type { Metadata } from 'next';
import { brand } from '@afd/shared';

export const metadata: Metadata = { title: 'Terms of Service' };

const EFFECTIVE = 'To be set at launch';

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-ink-subtle">Effective date: {EFFECTIVE}</p>

      <p>
        These Terms govern your use of {brand.name} (the &ldquo;Service&rdquo;), operated by{' '}
        {brand.legalEntity}. By creating an account you agree to them. If you are agreeing on behalf
        of a company, you confirm you are authorised to bind that company.
      </p>

      <h2>1. The Service</h2>
      <p>
        {brand.name} provides an AI-powered telephone receptionist. It answers calls to a phone
        number you provision or forward, converses with callers using information you supply,
        captures leads, records the appointment times callers ask for, and can transfer a caller to a
        number you nominate. It does not send text messages.
      </p>

      <h2>2. Your responsibilities</h2>
      <ul>
        <li>
          <strong>Accuracy of business information.</strong> The receptionist answers using the
          services, prices, hours, policies and rules you configure. You are responsible for keeping
          that information accurate. We do not verify it.
        </li>
        <li>
          <strong>Legal compliance for calls.</strong> You are responsible for complying with laws
          applicable to your calls, including consent, disclosure and recording requirements in every
          jurisdiction you operate in. Requirements vary significantly by state and country.
        </li>
        <li>
          <strong>Account security.</strong> You are responsible for activity under your account and
          for the roles you grant your team members.
        </li>
      </ul>

      <h2>3. AI limitations — read this carefully</h2>
      <p>
        The Service uses automated speech and language models. Despite the guardrails built into the
        product, it may misunderstand a caller, mishear a number, or fail to complete an action.
      </p>
      <ul>
        <li>The Service is provided for business convenience, not for emergencies.</li>
        <li>
          It must not be used as the sole channel for medical, safety, life-threatening or other
          time-critical communications.
        </li>
        <li>
          You should review call summaries and leads. We provide transcripts precisely so you can.
        </li>
      </ul>

      <h2>4. Fees, minutes and overage</h2>
      <p>
        Subscription fees are billed monthly in advance through our payment processor. Each plan
        includes a monthly allowance of AI voice minutes. Usage is metered per call and rounded up to
        the next whole minute. Minutes used beyond your allowance are billed at the published
        overage rate in the following invoice.
      </p>
      <p>
        <strong>Founding Member pricing.</strong> Where offered, the Founding Member rate applies for
        as long as your subscription remains continuously active. If your subscription lapses or is
        cancelled, the rate is lost and any later subscription is at current pricing. An activated
        Founding Member allocation is not returned to the available pool.
      </p>

      <h2>5. Cancellation and refunds</h2>
      <p>
        You may cancel at any time through the billing portal. Cancellation takes effect at the end
        of the current billing period; the Service remains available until then. Fees already paid
        are non-refundable except where required by law.
      </p>

      <h2>6. Telephone numbers</h2>
      <p>
        Phone numbers provisioned through the Service are supplied by an underlying carrier. On
        cancellation, numbers may be released and cannot be guaranteed to be recoverable. If you
        depend on a number, port it to a carrier account you control.
      </p>

      <h2>7. Data</h2>
      <p>
        You retain ownership of your business information, call transcripts, leads and appointments.
        We process them to provide the Service, as described in the{' '}
        <a href="/legal/privacy">Privacy Policy</a>. You may export your data or request deletion
        from account settings.
      </p>

      <h2>8. Acceptable use</h2>
      <p>
        Your use is subject to the <a href="/legal/acceptable-use">Acceptable Use Policy</a>. We may
        suspend an account that violates it.
      </p>

      <h2>9. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. The Service depends
        on third-party telephony, AI and calendar providers. Where possible, calls that cannot be
        answered by the AI are routed to a fallback number you configure.
      </p>

      <h2>10. Disclaimers and liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind to the fullest
        extent permitted by law. To the maximum extent permitted by law, our aggregate liability
        arising out of or relating to the Service is limited to the fees you paid in the twelve
        months preceding the claim.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms. Material changes will be notified by email or in the application
        before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        <a href={`mailto:${brand.contact.legal}`}>{brand.contact.legal}</a>
      </p>
    </>
  );
}
