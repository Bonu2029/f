import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "How cancellations, refunds and no-shows work on NOW.",
};

export default function Page() {
  return (
    <LegalPage
      title="Cancellation Policy"
      updated="August 2026"
      intro="Every business on NOW sets its own cancellation window, and it is always shown before you pay. This page explains the framework those policies sit inside."
      sections={[
        {
          heading: "The free window",
          body: [
            "Most businesses allow free cancellation up to four hours before the appointment. Some set a longer window — massage studios and home services typically use 12 or 24 hours.",
            "The exact window for your booking is shown at checkout and again on your booking details page.",
          ],
        },
        {
          heading: "Cancelling late",
          body: [
            "Cancelling after the free window may incur a fee of up to the percentage stated in that business's policy, commonly 50% of the service price.",
            "The time is returned to the marketplace immediately so somebody else can take it, which is often how a late cancellation ends up costing nothing.",
          ],
        },
        {
          heading: "No-shows",
          body: [
            "Not turning up without cancelling may be charged in full. Repeated no-shows can lead to restrictions on your account.",
          ],
        },
        {
          heading: "If the business cancels",
          body: [
            "You are refunded in full, notified immediately, and shown the closest alternative openings nearby.",
          ],
        },
        {
          heading: "Disputes",
          body: [
            "If something went wrong with a booking you can open a dispute from the booking details page. NOW reviews every dispute before any refund decision is made.",
          ],
        },
      ]}
    />
  );
}
