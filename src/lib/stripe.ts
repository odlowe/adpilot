/**
 * Stripe infrastructure — dependency-free (uses Stripe's REST API directly).
 *
 * To go live:
 *   1. Create a Stripe account, grab the secret key (starts sk_...)
 *   2. Set STRIPE_SECRET_KEY as an environment variable
 *   3. (For webhooks) point a Stripe webhook at /api/billing/webhook and set
 *      STRIPE_WEBHOOK_SECRET
 *
 * Until then, isStripeConfigured() is false and the UI says billing is
 * "coming soon" — nothing pretends to charge anyone.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { BRAND } from "./brand";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Creates a Stripe Checkout session for a campaign's monthly total
 * (ad spend + 15% fee) and returns the hosted payment page URL.
 */
export async function createCheckoutSession(options: {
  customerEmail: string;
  /** Our user id — echoed back by Stripe webhooks so we know who paid. */
  userId: string;
  campaignName: string;
  monthlyTotalCents: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Billing isn't switched on yet." };
  }

  const params = new URLSearchParams({
    mode: "subscription",
    customer_email: options.customerEmail,
    client_reference_id: options.userId,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(options.monthlyTotalCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `${BRAND.name} — ${options.campaignName}`,
    "line_items[0][price_data][product_data][description]":
      "Monthly ad budget + 15% management fee. Pause or cancel anytime.",
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return { error: data.error?.message ?? "Couldn't start checkout." };
  }
  return { url: data.url };
}

/**
 * Verifies a Stripe webhook signature (the "stripe-signature" header) so
 * only Stripe — not a random visitor — can trigger billing changes.
 * Implements Stripe's scheme: HMAC-SHA256 of "<timestamp>.<payload>" with
 * the webhook secret, plus a 5-minute replay window.
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  let timestamp = "";
  const candidates: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t" && value) timestamp = value;
    if (key === "v1" && value) candidates.push(value);
  }
  if (!timestamp || candidates.length === 0) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  return candidates.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, "utf8");
    return candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf);
  });
}
