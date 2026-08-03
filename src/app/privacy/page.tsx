import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { shop } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ashgrove Barber Co. collects, uses and stores the information you give us when you book an appointment or leave a review.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      breadcrumb="Privacy"
      eyebrow="Privacy Policy"
      lines={["What we keep,", "and why."]}
      intro="We only hold what we need to run your appointment. Here is exactly what that means."
      updated="1 August 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "When you book, we ask for your name, phone number and email address, plus any note you add about your hair. That is the whole list — we do not ask for an address, a date of birth or payment details, because you pay at the chair.",
            "If you leave a review, we store the name you give, the rating, the service, the barber and the text you write.",
          ],
        },
        {
          heading: "Why we hold it",
          body: [
            "Your contact details let us confirm the appointment, send one reminder the day before, and reach you if a barber is off sick and we need to move the slot.",
            "Your note about your hair goes to your barber so they do not have to ask the same question twice.",
          ],
        },
        {
          heading: "How long we keep it",
          body: [
            "Appointment records are kept for two years so your barber can look back at what worked. After that they are deleted automatically.",
            "Reviews stay published until you ask us to remove them.",
          ],
        },
        {
          heading: "Who else sees it",
          body: [
            "Only the barbers working in the shop, and the booking and email software we use to run it. We do not sell your details, and we do not pass them to advertisers.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "This site sets no advertising or tracking cookies. Your browser stores one small flag so the opening animation only plays once per visit — nothing about you is sent anywhere.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can ask to see, correct or delete everything we hold about you, and we will action it within 30 days.",
            `Email ${shop.email} or call ${shop.phone} and ask for Marcus.`,
          ],
        },
      ]}
    />
  );
}
