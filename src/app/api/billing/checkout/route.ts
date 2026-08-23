import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { getPlan } from "@/config/pricing";

/** Starts a Stripe Checkout session for the signed-in business. */
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (session.mode === "demo") {
    return NextResponse.json(
      { error: "Payments are not connected yet." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const plan = getPlan(String(form.get("plan") ?? ""));

  const result = await createCheckoutSession({
    planId: plan.id,
    businessId: session.businessId,
    email: session.profile.email,
    stripeCustomerId: session.subscription?.stripe_customer_id,
  });

  if ("error" in result) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?checkout=unavailable", request.url),
      { status: 303 },
    );
  }

  return NextResponse.redirect(result.url, { status: 303 });
}
