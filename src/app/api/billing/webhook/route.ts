import { NextResponse } from "next/server";

/**
 * Stripe webhook receiver (subscription created/updated/cancelled, payment
 * failed, etc.). Skeleton is in place; add signature verification with
 * STRIPE_WEBHOOK_SECRET and event handling when payments go live.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
    // Not configured yet — acknowledge so Stripe test pings don't error.
    return NextResponse.json({ received: true, configured: false });
  }

  // TODO when payments launch:
  //  1. Verify `signature` against STRIPE_WEBHOOK_SECRET
  //  2. Handle checkout.session.completed → mark campaign as paid/live
  //  3. Handle invoice.payment_failed → notify the owner, pause campaign
  console.info(`[stripe:webhook] received ${payload.length} bytes`);
  return NextResponse.json({ received: true });
}
