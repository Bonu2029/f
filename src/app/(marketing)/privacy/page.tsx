import type { Metadata } from "next";
import { LegalBlock, LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <LegalBlock heading="What we store">
        <p>
          {brand.name} stores the information a business enters about its
          installations: the tag, the customer it belongs to, what was
          installed, when, and any warranty date. We also store account details
          for the business owner.
        </p>
      </LegalBlock>

      <LegalBlock heading="What a public tag page shows">
        <p>
          A tag page shows only the installing business&rsquo;s own details, the
          installed item, the installation date and warranty information. It
          never shows a customer&rsquo;s name, phone number, email address,
          street address or internal notes.
        </p>
      </LegalBlock>

      <LegalBlock heading="Who can see business data">
        <p>
          Each business can only access its own records. Data is separated at
          the database level, not just in the interface.
        </p>
      </LegalBlock>

      <LegalBlock heading="Customers do not need an account">
        <p>
          A homeowner tapping a tag is not asked to sign up or install anything.
          If they send a service request, we pass their name, phone number and
          message to the business that installed the equipment.
        </p>
      </LegalBlock>

      <LegalBlock heading="Contact">
        <p>
          Questions about privacy? Email{" "}
          <a
            className="text-accent-600 underline underline-offset-4"
            href={`mailto:${brand.supportEmail}`}
          >
            {brand.supportEmail}
          </a>
          .
        </p>
      </LegalBlock>
    </LegalPage>
  );
}
