import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Community & Safety Guidelines",
  description: "What NOW expects from customers and businesses, and how to report a problem.",
};

export default function Page() {
  return (
    <LegalPage
      title="Community & Safety Guidelines"
      updated="August 2026"
      intro="NOW works because customers turn up and businesses deliver. These guidelines describe what both sides can expect, and what to do when something goes wrong."
      sections={[
        {
          heading: "For customers",
          body: [
            "Turn up on time, or cancel early enough that the business can resell the slot.",
            "Keep messages about the booking. Businesses can block anyone using messaging for anything else.",
            "Reviews should describe your own experience of a booking you actually completed.",
          ],
        },
        {
          heading: "For businesses",
          body: [
            "Only publish availability you can honour, and honour the price you publish.",
            "Treat every customer the same regardless of who they are. Discrimination is grounds for immediate removal.",
            "Reply to reviews if you want, but never pressure a customer to change or remove one.",
          ],
        },
        {
          heading: "Reporting a problem",
          body: [
            "Every business profile has a Report option, every booking can be disputed, and businesses can report a customer or a review from their dashboard.",
            "Reports go to the NOW trust team. Nothing is shared with the other party automatically.",
          ],
        },
        {
          heading: "Blocking",
          body: [
            "Businesses can decline future bookings from a specific customer. Customers can hide a business from their results. Blocking is never announced to the other side.",
          ],
        },
        {
          heading: "Emergencies",
          body: [
            "NOW is not an emergency service. If you are in danger, contact your local emergency number first.",
          ],
        },
      ]}
    />
  );
}
