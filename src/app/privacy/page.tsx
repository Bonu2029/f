import type { Metadata } from "next";
import LegalPage from "@/components/layout/LegalPage";
import { site, formattedAddress, hasRealEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} handles the information you share when you book an appointment.`,
  robots: { index: true, follow: true },
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <p>
        This page explains what {site.name} does with the information you give
        us through this website.
      </p>

      <h2>What we collect</h2>
      <p>
        Only what you type into the booking form: your name, email address,
        phone number, the service and time you asked for, and any notes you
        chose to add.
      </p>

      <h2>Why we collect it</h2>
      <p>
        To reply to your appointment request and to confirm the details. That is
        the only reason.
      </p>

      <h2>Who else sees it</h2>
      <ul>
        <li>
          The email or scheduling service the salon uses to receive booking
          requests.
        </li>
        <li>
          Google, if you follow a link to the salon&apos;s Google profile or use
          the embedded map — their own privacy terms apply there.
        </li>
      </ul>
      <p>We do not sell your information, and we do not share it for advertising.</p>

      <h2>Cookies and tracking</h2>
      <p>
        This site sets no advertising or analytics cookies of its own. The
        embedded Google map may set cookies from Google when it loads.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Booking requests are kept only as long as needed to manage your
        appointment and the salon&apos;s records.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to see, correct or delete the information we hold about
        you. Contact the salon
        {hasRealEmail ? (
          <>
            {" "}
            at <a href={`mailto:${site.email}`}>{site.email}</a>
          </>
        ) : (
          " using the contact details on the home page"
        )}
        , or in person at {formattedAddress}.
      </p>
    </LegalPage>
  );
}
