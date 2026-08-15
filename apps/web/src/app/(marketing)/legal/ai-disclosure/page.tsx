import type { Metadata } from 'next';
import { brand } from '@afd/shared';

export const metadata: Metadata = { title: 'AI & communications disclosure' };

export default function AiDisclosurePage() {
  return (
    <>
      <h1>AI &amp; communications disclosure</h1>
      <p>
        This page explains how {brand.name} behaves on a call, what it will never do, and what you as
        a business owner remain responsible for.
      </p>

      <h2>The receptionist is AI, and says so</h2>
      <ul>
        <li>It never claims to be a human being.</li>
        <li>If a caller asks whether they are speaking to a person, a bot, AI or a recording, it answers truthfully and immediately. This behaviour is built into the system prompt on every call and cannot be configured away.</li>
        <li>You choose whether the greeting also announces it up front. We recommend it, and some jurisdictions require it.</li>
      </ul>

      <h2>What it will not do</h2>
      <ul>
        <li>Quote a price that is not stored in your business knowledge.</li>
        <li>Confirm a service you have not listed.</li>
        <li>Offer an appointment time that the calendar did not return as free.</li>
        <li>Say a booking, text or transfer succeeded when the underlying action failed.</li>
        <li>Invent discounts.</li>
        <li>Ask for or repeat card numbers, bank details or social security numbers.</li>
        <li>Give medical, legal or financial advice on your behalf.</li>
      </ul>

      <h2>Recording and transcripts</h2>
      <p>
        Call audio is not recorded. A written transcript and a summary are stored so you can see what
        happened on each call. Recording and consent laws differ by jurisdiction — some require all
        parties to consent. If you need audio recording, get legal advice first and configure
        disclosure accordingly.
      </p>

      <h2>Text messages</h2>
      <p>
        The receptionist can send confirmations, follow-ups and secure photo-upload links. You are
        responsible for having a lawful basis to message the people it texts.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep your services, prices, hours and policies accurate.</li>
        <li>Review call summaries and leads — the receptionist is an assistant, not a replacement for oversight.</li>
        <li>Comply with the calling, messaging and disclosure laws that apply where you operate.</li>
        <li>Do not use the Service for emergencies or anything safety-critical.</li>
      </ul>
    </>
  );
}
