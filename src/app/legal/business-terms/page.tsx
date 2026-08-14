import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Business Terms",
  description: "Terms for businesses listing on NOW. Placeholder pending legal review.",
};

export default function Page() {
  return (
    <LegalPage
      title="Business Terms"
      updated="August 2026"
      intro="These terms apply to businesses that list services and availability on NOW."
      sections={[
        {
          heading: "Listing your business",
          body: [
            "You confirm you are authorised to represent the business, that the services and prices you publish are accurate, and that you hold any licence or insurance your trade requires.",
            "A verified badge is granted only after registration, contact, address and identity checks pass. Do not imply verification you have not completed.",
          ],
        },
        {
          heading: "Availability you publish",
          body: [
            "Availability published to NOW is a real, bookable commitment. Repeatedly cancelling bookings taken through published openings may lead to suspension.",
            "You may set a visibility radius and a discount on any opening. The price you publish is the price the customer pays.",
          ],
        },
        {
          heading: "Commission and payouts",
          body: [
            "NOW charges a marketplace commission on bookings it brings you. The current rate is shown in your dashboard settings and applies from the moment a booking is made.",
            "Bookings you take directly — by phone, walk-in, or your own channels — carry no commission, including when you record them in the NOW calendar.",
            "Payouts are made on a weekly schedule to the payout account you connect.",
          ],
        },
        {
          heading: "Cancellations by you",
          body: [
            "Cancelling a confirmed booking refunds the customer in full and returns that time to the marketplace. Frequent business-side cancellations affect your placement.",
          ],
        },
        {
          heading: "Customer data",
          body: [
            "Customer details are provided to you for the purpose of delivering the booking. You may not use them for unrelated marketing without separate consent, or share them with third parties.",
          ],
        },
        {
          heading: "Suspension",
          body: [
            "NOW may suspend a listing for fraud, safety concerns, sustained no-shows, or misrepresentation. This section requires drafting by a qualified lawyer before launch.",
          ],
        },
      ]}
    />
  );
}
