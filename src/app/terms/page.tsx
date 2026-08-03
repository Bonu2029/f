import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { shop } from "@/lib/data";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Booking, cancellation, lateness and payment terms for appointments at Ashgrove Barber Co. in Shoreditch, London.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      breadcrumb="Terms"
      eyebrow="Terms of Service"
      lines={["The short", "version."]}
      intro="Booking, cancelling, running late and paying — the rules that keep the chairs moving."
      updated="1 August 2026"
      sections={[
        {
          heading: "Booking an appointment",
          body: [
            "A slot is held for you as soon as the confirmation screen appears and the email lands. No deposit is taken online — you pay in the shop after the cut.",
            "Slots are reserved for the service you picked. If you want something longer once you are in the chair, we will fit it in when the diary allows.",
          ],
        },
        {
          heading: "Cancelling or moving",
          body: [
            "Cancel or move free of charge up to 12 hours before your slot, using the link in your confirmation email or by calling the shop.",
            "Two no-shows in a row and we will ask for a card on file before the next booking. That is the only penalty we apply.",
          ],
        },
        {
          heading: "Running late",
          body: [
            "We hold your chair for 10 minutes. After that we may need to shorten the service so the next person is not pushed back, and the full price still applies.",
            "If we are running late, we will tell you at the door and you can choose to wait, rebook or leave.",
          ],
        },
        {
          heading: "Payment",
          body: [
            "Card and cash are both fine. Prices shown on this site are current and include the consultation and finish.",
            "The student and NHS rate is £6 off any service from Tuesday to Thursday, on presentation of a valid card.",
          ],
        },
        {
          heading: "If you are not happy",
          body: [
            "Tell your barber before you leave the chair, or call within 48 hours. We will book you back in and put it right at no charge.",
            "We do not refund a cut that has already been altered elsewhere.",
          ],
        },
        {
          heading: "Children and accessibility",
          body: [
            "Under-12s book the Kids Cut and must be accompanied by an adult who stays in the shop.",
            "The shop is at street level with a step-free entrance. Call ahead on " + shop.phone + " if you need us to keep space clear.",
          ],
        },
      ]}
    />
  );
}
