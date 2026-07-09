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

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Creates a Stripe Checkout session for a campaign's monthly total
 * (ad spend + 15% fee) and returns the hosted payment page URL.
 */
export async function createCheckoutSession(options: {
  customerEmail: string;
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
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(options.monthlyTotalCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `AdPilot — ${options.campaignName}`,
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
