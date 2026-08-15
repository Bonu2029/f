import type { Metadata } from 'next';
import { brand } from '@afd/shared';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-ink-subtle">Effective date: To be set at launch</p>

      <p>
        This policy explains what {brand.legalEntity} collects when you use {brand.name}, why, and
        what choices you have. It covers two groups of people: our customers (businesses and their
        team members) and the callers who phone those businesses.
      </p>

      <h2>1. Information about our customers</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address and a hashed password (held by our authentication provider).</li>
        <li><strong>Business data:</strong> everything you enter about your business — services, prices, hours, policies, service area, FAQs and receptionist rules.</li>
        <li><strong>Billing data:</strong> subscription status, plan, invoice history and usage totals. <strong>We never see or store your card details</strong>; payment information is handled entirely by our payment processor.</li>
        <li><strong>Operational logs:</strong> request metadata used to run and secure the Service. Logs are automatically redacted of credentials and tokens.</li>
      </ul>

      <h2>2. Information about callers</h2>
      <p>When someone calls a number connected to the Service, we process:</p>
      <ul>
        <li>the caller&rsquo;s phone number and the number they dialled;</li>
        <li>a written transcript of the conversation;</li>
        <li>information the caller provides — name, address, email, what they need;</li>
        <li>a summary of the call and the appointment time the caller asked for, if any.</li>
      </ul>
      <p>
        <strong>Audio is not recorded.</strong> Speech is processed to produce a transcript; raw call
        audio is not stored by the Service.
      </p>
      <p>
        The business being called is the controller of caller information; we process it on that
        business&rsquo;s instructions.
      </p>

      <h2>3. Sub-processors</h2>
      <p>The Service depends on these categories of provider:</p>
      <ul>
        <li><strong>Cloud database, authentication and file storage</strong> — hosts account and business data.</li>
        <li><strong>Voice provider</strong> — supplies phone numbers, carries the call, transcribes speech and produces the call summary. Your business information is sent to it as the receptionist&rsquo;s instructions.</li>
        <li><strong>AI model provider</strong> — generates the receptionist&rsquo;s side of the conversation, via the voice provider.</li>
        <li><strong>Payment processor</strong> — handles subscriptions, cards and invoices.</li>
        <li><strong>Email provider</strong> — transactional notifications.</li>
      </ul>
      <p>The specific vendors must be listed here before launch, with links to their own privacy terms.</p>

      <h2>4. Retention</h2>
      <ul>
        <li>Account and business data: kept while your account is active.</li>
        <li>Calls, transcripts, leads and appointments: kept while your account is active, then deleted according to the retention period configured for your account.</li>
        <li>Billing and audit records: retained as long as required for financial, tax and legal obligations, even after account deletion.</li>
      </ul>

      <h2>5. Security</h2>
      <ul>
        <li>Row-level database isolation between businesses, enforced by the database itself.</li>
        <li>Secrets encrypted with AES-256-GCM before storage; invitation tokens stored only as keyed hashes.</li>
        <li>Webhook verification on every inbound provider callback, compared in constant time.</li>
        <li>Secret redaction in application logs.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, export or delete your
        personal information. Account owners can export business data and request deletion from
        account settings. For anything else, contact{' '}
        <a href={`mailto:${brand.contact.privacy}`}>{brand.contact.privacy}</a>.
      </p>
      <p>
        If you are a caller and want your information removed, contact the business you called; they
        control that data. We will assist them in responding.
      </p>

      <h2>7. Contact</h2>
      <p><a href={`mailto:${brand.contact.privacy}`}>{brand.contact.privacy}</a></p>
    </>
  );
}
