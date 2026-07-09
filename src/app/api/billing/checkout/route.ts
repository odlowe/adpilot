import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

/**
 * Starts a Stripe Checkout for a campaign's monthly total.
 * Fully wired — activates the moment STRIPE_SECRET_KEY is set.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Payments aren't switched on yet — campaigns run in preview mode. (Set STRIPE_SECRET_KEY to enable.)",
      },
      { status: 501 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { campaignName?: string; budget?: number }
    | null;

  const budget = Math.min(5000, Math.max(250, Number(body?.budget) || 0));
  const totalCents = Math.round(budget * 1.15 * 100);
  const origin = new URL(request.url).origin;

  const session = await createCheckoutSession({
    customerEmail: user.email,
    campaignName: body?.campaignName ?? "Campaign",
    monthlyTotalCents: totalCents,
    successUrl: `${origin}/dashboard?billing=success`,
    cancelUrl: `${origin}/dashboard?billing=cancelled`,
  });

  if ("error" in session) {
    return NextResponse.json({ error: session.error }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
