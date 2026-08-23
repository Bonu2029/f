import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { createPortalSession } from "@/lib/stripe/billing";

/** Opens the Stripe billing portal so a business can manage its subscription. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  const customerId = session.subscription?.stripe_customer_id;

  if (session.mode === "demo" || !customerId) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?portal=unavailable", request.url),
      { status: 303 },
    );
  }

  const result = await createPortalSession(customerId);

  if ("error" in result) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?portal=unavailable", request.url),
      { status: 303 },
    );
  }

  return NextResponse.redirect(result.url, { status: 303 });
}
