import { NextResponse } from "next/server";
import { site, formattedAddress } from "@/lib/site";
import { services } from "@/lib/services";
import { specialists } from "@/lib/content";

/* ============================================================================
 * BOOKING REQUEST ENDPOINT
 * ----------------------------------------------------------------------------
 * This is a *request*, not a confirmed reservation — the salon replies to
 * confirm. The UI says so explicitly rather than implying a slot is held.
 *
 * Delivery is whichever of these is configured, in order:
 *   RESEND_API_KEY + BOOKING_TO_EMAIL   → email via Resend
 *   BOOKING_WEBHOOK_URL                 → POST the payload as JSON
 *   nothing                             → 501, and the UI falls back to the
 *                                         salon's existing booking link/phone
 * ========================================================================== */

export const runtime = "nodejs";

type Payload = {
  service?: unknown;
  specialist?: unknown;
  date?: unknown;
  time?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
};

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const booking = {
    service: str(body.service, 80),
    specialist: str(body.specialist, 80),
    date: str(body.date, 10),
    time: str(body.time, 12),
    name: str(body.name, 120),
    email: str(body.email, 200),
    phone: str(body.phone, 40),
    notes: str(body.notes, 1200),
  };

  const errors: Record<string, string> = {};

  if (!services.some((s) => s.id === booking.service)) {
    errors.service = "Choose a service.";
  }
  if (!specialists.some((s) => s.id === booking.specialist)) {
    errors.specialist = "Choose a specialist.";
  }
  if (!ISO_DATE.test(booking.date)) {
    errors.date = "Choose a date.";
  }
  if (!booking.time) {
    errors.time = "Choose a time.";
  }
  if (booking.name.length < 2) {
    errors.name = "Tell us your name.";
  }
  if (!EMAIL.test(booking.email)) {
    errors.email = "That email address does not look right.";
  }
  if (booking.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "A contactable phone number, please.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const serviceName =
    services.find((s) => s.id === booking.service)?.name ?? booking.service;
  const specialistName =
    specialists.find((s) => s.id === booking.specialist)?.name ?? booking.specialist;

  const summary = [
    `New booking request — ${site.name}`,
    "",
    `Service:    ${serviceName}`,
    `Specialist: ${specialistName}`,
    `Preferred:  ${booking.date} at ${booking.time}`,
    "",
    `Name:       ${booking.name}`,
    `Email:      ${booking.email}`,
    `Phone:      ${booking.phone}`,
    booking.notes ? `\nNotes:\n${booking.notes}` : "",
    "",
    `Sent from ${site.url} · ${formattedAddress}`,
  ].join("\n");

  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_TO_EMAIL;
  const webhook = process.env.BOOKING_WEBHOOK_URL;

  try {
    if (resendKey && to) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.BOOKING_FROM_EMAIL ?? "bookings@resend.dev",
          to: [to],
          reply_to: booking.email,
          subject: `Booking request — ${booking.name} · ${serviceName}`,
          text: summary,
        }),
      });

      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      return NextResponse.json({ ok: true, delivered: "email" });
    }

    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...booking, serviceName, specialistName, summary }),
      });

      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      return NextResponse.json({ ok: true, delivered: "webhook" });
    }
  } catch {
    return NextResponse.json(
      { error: "We could not send that just now." },
      { status: 502 },
    );
  }

  // Nothing configured — say so plainly instead of pretending it was sent.
  return NextResponse.json(
    {
      error: "Booking delivery is not configured.",
      unconfigured: true,
      bookingUrl: site.bookingUrl || null,
    },
    { status: 501 },
  );
}
