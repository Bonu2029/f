import type { Metadata } from "next";
import { LegalBlock, LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="August 2026">
      <LegalBlock heading="Using the service">
        <p>
          {brand.name} is a subscription service for businesses. You are
          responsible for the accuracy of the installation and warranty
          information you publish on your tag pages, and for the service you
          provide to the customers who reach you through them.
        </p>
      </LegalBlock>

      <LegalBlock heading="Your account">
        <p>
          Keep your login details private. You are responsible for activity
          under your account. Tell us right away if you think someone else has
          access to it.
        </p>
      </LegalBlock>

      <LegalBlock heading="Billing">
        <p>
          Plans are billed monthly and renew until you cancel. You can cancel at
          any time and keep access until the end of the period you have paid
          for.
        </p>
      </LegalBlock>

      <LegalBlock heading="Your content">
        <p>
          Your business name, logo, contact details and installation records
          stay yours. We use them only to run the service for you.
        </p>
      </LegalBlock>

      <LegalBlock heading="Ending the agreement">
        <p>
          You can close your account at any time. We may suspend an account that
          is used unlawfully or in a way that harms other people.
        </p>
      </LegalBlock>
    </LegalPage>
  );
}
