import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How NOW handles personal data. Placeholder pending legal review.",
};

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 2026"
      intro="This policy describes what personal data NOW collects, why it is collected, and the choices you have. It is written to be readable rather than exhaustive, and needs legal review before launch."
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account details you give us: name, email, phone number and optional photo.",
            "Booking data: which business you booked, when, which service, and what you paid.",
            "Location, only when you choose to share it. Denying location access does not block any part of the app — you can always search by neighbourhood or address instead.",
            "Messages you exchange with a business about a booking.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To show availability near you, complete bookings, send the reminders and alerts you have opted into, prevent fraud, and resolve disputes.",
            "We do not sell personal data.",
          ],
        },
        {
          heading: "What businesses see",
          body: [
            "A business you book with sees your name, contact details, booking history with that business, and any note you send them. They do not see your bookings with anyone else.",
          ],
        },
        {
          heading: "Notifications",
          body: [
            "Appointment reminders, last-minute deals, favourite-business openings, nearby openings and product news are all separately controllable in your notification settings. Promotional messages are off by default.",
          ],
        },
        {
          heading: "Retention and deletion",
          body: [
            "Booking and payment records are retained as long as required for accounting and dispute resolution. You can request deletion of your account and associated personal data.",
          ],
        },
        {
          heading: "Security",
          body: [
            "Access to data is restricted by role: a business can only reach its own bookings, customers, staff and payouts, and a customer can only reach their own information. Payment credentials are handled by our payment processor and are never stored by NOW.",
          ],
        },
      ]}
    />
  );
}
