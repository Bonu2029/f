import type { Metadata } from 'next';
import { brand } from '@afd/shared';

export const metadata: Metadata = { title: 'Data processing information' };

export default function DataProcessingPage() {
  return (
    <>
      <h1>Data processing information</h1>
      <p className="text-sm text-ink-subtle">
        Placeholder for a Data Processing Addendum. Complete with counsel before offering the Service
        to customers subject to GDPR, UK GDPR or similar regimes.
      </p>

      <h2>Roles</h2>
      <p>
        For information about callers, the customer business is the controller and{' '}
        {brand.legalEntity} is the processor. For customer account and billing data,{' '}
        {brand.legalEntity} is the controller.
      </p>

      <h2>Subject matter and duration</h2>
      <p>
        Processing continues for the duration of the subscription plus the configured retention
        period, subject to legal record-keeping obligations.
      </p>

      <h2>Nature and purpose</h2>
      <p>
        Answering inbound telephone calls, transcribing conversations, capturing enquiry details,
        scheduling appointments, sending SMS messages and storing photographs supplied by callers.
      </p>

      <h2>Categories of data subject</h2>
      <ul>
        <li>Customer personnel (owners, admins, staff).</li>
        <li>Callers to the customer&rsquo;s business.</li>
      </ul>

      <h2>Categories of personal data</h2>
      <ul>
        <li>Contact details: name, telephone number, email address, service address.</li>
        <li>Conversation transcripts and summaries.</li>
        <li>Appointment details.</li>
        <li>Photographs voluntarily uploaded by callers.</li>
      </ul>
      <p>
        No special-category data is intentionally processed. Callers should not be asked for it, and
        the receptionist is instructed to refuse card and identification numbers.
      </p>

      <h2>To be completed before launch</h2>
      <ul>
        <li>Named list of sub-processors and their locations.</li>
        <li>International transfer mechanism (for example, Standard Contractual Clauses).</li>
        <li>Technical and organisational measures annex.</li>
        <li>Breach notification timelines.</li>
        <li>Audit and deletion procedures.</li>
      </ul>
    </>
  );
}
