import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of the NOW marketplace. Placeholder pending legal review.",
};

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="August 2026"
      intro="These terms describe the relationship between you and NOW when you use the marketplace to discover and book appointments with independent local businesses."
      sections={[
        {
          heading: "1. What NOW is",
          body: [
            "NOW is a marketplace. We show you appointment availability published by independent businesses and let you book it. The service itself is performed by that business, not by NOW.",
            "Each business sets its own prices, services, staffing and cancellation policy. NOW displays that information as the business provides it.",
          ],
        },
        {
          heading: "2. Your account",
          body: [
            "You can browse and compare availability without an account. Booking requires an account so the business knows who is coming and you can manage or cancel the appointment.",
            "You are responsible for keeping your credentials secure and for activity that happens under your account.",
          ],
        },
        {
          heading: "3. Bookings and payment",
          body: [
            "When you book, you agree to pay the displayed service price plus the NOW service fee shown at checkout. NOW collects payment on the business's behalf and remits the business's share.",
            "Prices displayed for last-minute openings are the prices you pay. Nothing is added after checkout.",
          ],
        },
        {
          heading: "4. Cancellations and no-shows",
          body: [
            "Each business publishes a free cancellation window, shown before you pay. Cancelling inside that window is free. Cancelling later, or not turning up, may incur the fee stated in that business's policy.",
            "If a business cancels on you, you are refunded in full and we surface the nearest alternative openings.",
          ],
        },
        {
          heading: "5. Reviews",
          body: [
            "Only customers who completed a booking through NOW can review a business. Reviews are not removed for being negative. They may be removed if they are abusive, contain private information, are not about the business, or appear to be fraudulent.",
          ],
        },
        {
          heading: "6. Acceptable use",
          body: [
            "Do not use NOW to harass anyone, misrepresent who you are, scrape the service, or interfere with its operation. Messaging is provided so customers and businesses can coordinate a booking, not for unrelated communication.",
          ],
        },
        {
          heading: "7. Liability",
          body: [
            "NOW does not perform the services booked through it and does not guarantee any particular outcome from a business. This section requires drafting by a qualified lawyer before launch.",
          ],
        },
        {
          heading: "8. Changes",
          body: [
            "We may update these terms. Material changes will be communicated before they take effect.",
          ],
        },
      ]}
    />
  );
}
