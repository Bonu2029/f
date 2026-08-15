import type { Metadata } from 'next';
import { brand } from '@afd/shared';

export const metadata: Metadata = { title: 'Acceptable Use Policy' };

export default function AcceptableUsePage() {
  return (
    <>
      <h1>Acceptable Use Policy</h1>
      <p>
        This policy sets out what you may not do with {brand.name}. It exists to protect callers,
        other customers and the telephone networks we depend on.
      </p>

      <h2>You may not use the Service to</h2>
      <ul>
        <li>Make or receive calls or messages unlawfully, including in breach of telemarketing, do-not-call, robocall or messaging-consent rules.</li>
        <li>Configure the receptionist to claim it is a human being, or to deny being an AI when asked directly.</li>
        <li>Impersonate another business, person or public body.</li>
        <li>Collect payment card numbers, bank details or government identification numbers through the receptionist.</li>
        <li>Provide medical, legal or financial advice through the receptionist unless your business is qualified to do so and you have configured an appropriate, compliant workflow.</li>
        <li>Operate an emergency, crisis, medical triage or safety-of-life service.</li>
        <li>Send unsolicited bulk messages, or messages to people who have not agreed to hear from you.</li>
        <li>Harass, defraud, threaten or deceive callers.</li>
        <li>Attempt to access another customer&rsquo;s data, probe our infrastructure, or circumvent rate limits and access controls.</li>
        <li>Resell the Service as your own without a written agreement.</li>
      </ul>

      <h2>Enforcement</h2>
      <p>
        We may suspend or terminate an account that violates this policy, and will cooperate with
        lawful requests from carriers and authorities. Where practical we will notify you first.
      </p>

      <h2>Reporting</h2>
      <p>
        Report abuse to <a href={`mailto:${brand.contact.support}`}>{brand.contact.support}</a>.
      </p>
    </>
  );
}
