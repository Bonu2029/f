import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of use for the ${site.name} website and appointment requests.`,
  robots: { index: true, follow: true },
};

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="August 2026">
      <p>
        These terms cover your use of this website and the appointment requests
        you send through it.
      </p>

      <h2>Appointment requests</h2>
      <p>
        Submitting the booking form sends a <strong>request</strong>. It is not a
        confirmed reservation, and no time is held for you until the salon
        replies to confirm it.
      </p>

      <h2>Pricing and duration</h2>
      <p>
        Any prices and durations shown on this site are guides. Your final price
        is quoted at consultation, before any service begins, and depends on
        hair length, density, condition and the work involved.
      </p>

      <h2>Cancellations</h2>
      <p>
        Please give as much notice as you can if you need to change or cancel, so
        the time can be offered to someone else. The salon will confirm its
        cancellation policy when it confirms your appointment.
      </p>

      <h2>Photography</h2>
      <p>
        Before and after photographs of client work are only published with that
        client&apos;s permission.
      </p>

      <h2>Content on this site</h2>
      <p>
        Text, imagery and design on this site belong to {site.legalName} and its
        creators, and may not be reused without permission.
      </p>

      <h2>Accuracy</h2>
      <p>
        We keep the information here as accurate as we can, but services, hours
        and pricing can change. Contact the salon directly if anything is
        important to your visit.
      </p>
    </LegalPage>
  );
}
