/**
 * Email infrastructure — Resend-ready.
 *
 * Set RESEND_API_KEY (and optionally EMAIL_FROM) and every email below sends
 * for real via https://resend.com (free tier available, no SDK needed).
 * Without a key, emails are logged to the server console so every flow can
 * be developed and demoed end-to-end.
 */

const FROM = process.env.EMAIL_FROM ?? "AdPilot <hello@updates.adpilot.example>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    console.info(`[email:dev] To: ${options.to}\nSubject: ${options.subject}\n\n${options.text}`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [options.to],
      subject: options.subject,
      text: options.text,
    }),
  });
  return { sent: res.ok };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your AdPilot password",
    text: [
      "Hi,",
      "",
      "Someone (hopefully you) asked to reset the password for this account.",
      `Reset it here within the next hour: ${resetUrl}`,
      "",
      "If this wasn't you, ignore this email — your password is unchanged.",
    ].join("\n"),
  });
}

/**
 * Launch confirmation + receipt, sent right after a campaign is created.
 * This is a transactional email, so it goes out regardless of digest prefs.
 */
export async function sendCampaignReceiptEmail(options: {
  to: string;
  ownerName: string;
  businessName: string;
  campaignName: string;
  budget: number;
  durationMonths: number;
  continuous: boolean;
  radiusMiles: number;
  zip: string;
  startDate: string;
}) {
  const { to, ownerName, businessName, campaignName, budget, durationMonths, continuous, radiusMiles, zip, startDate } = options;
  const fee = Math.round(budget * 0.15);
  const total = budget + fee;
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  const firstName = ownerName.split(" ")[0] || ownerName;
  const runLength = continuous
    ? "Continuous — runs month to month until you pause or end it"
    : `${durationMonths} month${durationMonths === 1 ? "" : "s"}`;
  const launchDate = new Date(startDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return sendEmail({
    to,
    subject: `Your campaign is launching — receipt for ${businessName}`,
    text: [
      `Hi ${firstName},`,
      "",
      `Great news — your new campaign for ${businessName} has been submitted to Google, Instagram, and Reddit. Most campaigns pass review and go live within 24 hours. Your agent takes it from here.`,
      "",
      "CAMPAIGN",
      `  ${campaignName}`,
      `  Launched: ${launchDate}`,
      `  Reach: ${radiusMiles} mile${radiusMiles === 1 ? "" : "s"}${zip ? ` around ${zip}` : ""}`,
      `  Run length: ${runLength}`,
      "",
      "RECEIPT (monthly)",
      `  Ad budget (paid to ad networks):  ${usd(budget)}`,
      `  AdPilot management fee (15%):     ${usd(fee)}`,
      `  ------------------------------------------`,
      `  Total monthly billing:            ${usd(total)}`,
      "",
      "You can pause, edit, or end this campaign anytime from your dashboard — no contracts, no penalties.",
      "",
      "— AdPilot",
    ].join("\n"),
  });
}

/**
 * The automated performance digest. A scheduled job (e.g. Vercel Cron hitting
 * an API route) should call this for every user whose emailPrefs.enabled is
 * true, on their chosen daily/weekly/monthly cadence.
 */
export async function sendCampaignDigest(options: {
  to: string;
  businessName: string;
  periodLabel: string; // "today" | "this week" | "this month"
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
}) {
  const { to, businessName, periodLabel, impressions, clicks, conversions, spent } = options;
  return sendEmail({
    to,
    subject: `${businessName}: your ads ${periodLabel} — ${clicks.toLocaleString()} visitors`,
    text: [
      `Here's how ${businessName}'s advertising did ${periodLabel}:`,
      "",
      `Views: ${impressions.toLocaleString()}`,
      `Website visitors: ${clicks.toLocaleString()}`,
      `Leads & calls: ${conversions.toLocaleString()}`,
      `Spent so far: $${spent.toLocaleString()}`,
      "",
      "Your agent keeps tuning things automatically. See details anytime in your dashboard.",
      "",
      "— AdPilot (you can change email frequency in Settings)",
    ].join("\n"),
  });
}
