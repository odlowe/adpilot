import { NextResponse } from "next/server";
import { findUserByEmail, getUserById, updateUser } from "@/lib/db";
import { reportError } from "@/lib/monitor";
import { verifyStripeSignature } from "@/lib/stripe";

/**
 * Stripe webhook receiver. Every request must carry a valid
 * "stripe-signature" header (verified against STRIPE_WEBHOOK_SECRET) —
 * anything else is rejected, so nobody can spoof a "payment succeeded".
 *
 * Handled events:
 *   checkout.session.completed → mark the user's billing active + remember
 *                                their Stripe customer id
 *   invoice.payment_failed     → mark billing inactive (card declined etc.)
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    // Refuse to process events we can't authenticate.
    return NextResponse.json(
      { error: "Webhook not configured (STRIPE_WEBHOOK_SECRET missing)." },
      { status: 503 }
    );
  }
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  interface StripeEvent {
    type: string;
    data: {
      object: {
        client_reference_id?: string | null;
        customer?: string | null;
        customer_email?: string | null;
        customer_details?: { email?: string | null } | null;
      };
    };
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch (err) {
    await reportError("stripe:webhook", err, { note: "unparseable payload" });
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const user = await findEventUser(obj.client_reference_id, obj.customer_details?.email);
      if (user) {
        await updateUser(user.id, {
          billingActive: true,
          stripeCustomerId: typeof obj.customer === "string" ? obj.customer : null,
        });
      } else {
        console.warn("[stripe:webhook] checkout completed but no matching user");
      }
      break;
    }
    case "invoice.payment_failed": {
      const user = await findEventUser(null, obj.customer_email);
      if (user) {
        await updateUser(user.id, { billingActive: false });
      }
      break;
    }
    default:
      // Other events are fine to acknowledge without action.
      break;
  }

  return NextResponse.json({ received: true });
}

/** Finds our user from a Stripe event: prefer our own id, fall back to email. */
async function findEventUser(userId?: string | null, email?: string | null) {
  if (userId) {
    const byId = await getUserById(userId);
    if (byId) return byId;
  }
  if (email) {
    return findUserByEmail(email);
  }
  return null;
}
