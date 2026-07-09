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
