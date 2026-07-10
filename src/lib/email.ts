/**
 * Email infrastructure — Resend-ready.
 *
 * Set RESEND_API_KEY (and optionally EMAIL_FROM) and every email below sends
 * for real via https://resend.com (free tier available, no SDK needed).
 * Without a key, emails are logged to the server console so every flow can
 * be developed and demoed end-to-end.
 *
 * All emails ship both a branded HTML version and a plain-text fallback.
 * The HTML uses table layout + inline styles only — the lingua franca that
 * renders correctly in Gmail, Outlook, and Apple Mail alike.
 */
import { BRAND } from "./brand";


const FROM = process.env.EMAIL_FROM ?? `${BRAND.name} <hello@updates.adpilot.example>`;

// Brand palette (mirrors tailwind.config.ts)
const NAVY = "#0f2a52";
const NAVY_DARK = "#0b1f3a";
const EMERALD = "#059669";
const SLATE = "#64748b";
const SLATE_LIGHT = "#f1f5f9";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
      ...(options.html ? { html: options.html } : {}),
    }),
  });
  return { sent: res.ok };
}

// ---- shared branded layout ----------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Emerald call-to-action button that survives every mail client. */
function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
      <tr>
        <td style="border-radius:12px;background:${EMERALD};">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Wraps any content in the app shell: soft grey backdrop, white card,
 * navy header with the wordmark, friendly footer.
 */
function emailShell(options: { preheader: string; contentHtml: string }): string {
  const { preheader, contentHtml } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${SLATE_LIGHT};">
  <!-- preview text shown next to the subject line in inboxes -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${SLATE_LIGHT};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SLATE_LIGHT};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- header -->
        <tr>
          <td style="background:${NAVY_DARK};border-radius:16px 16px 0 0;padding:22px 32px;font-family:Arial,Helvetica,sans-serif;">
            <span style="font-size:21px;font-weight:bold;letter-spacing:-0.3px;">
              <span style="color:#ffffff;">Ad</span><span style="color:#34d399;">Pilot</span>
            </span>
            <span style="float:right;font-size:12px;color:#94a3b8;padding-top:6px;">Your automated marketing agent</span>
          </td>
        </tr>

        <!-- body card -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:1.65;">
            ${contentHtml}
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:22px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;line-height:1.7;">
            &copy; ${new Date().getFullYear()} ${BRAND.name} — ${BRAND.tagline}.<br>
            No contracts. Pause anytime. Change email preferences in your dashboard Settings.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const heading = (text: string) =>
  `<h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:${NAVY};letter-spacing:-0.3px;">${escapeHtml(text)}</h1>`;

const paragraph = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;

// ---- password reset -------------------------------------------------------------

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: `Reset your ${BRAND.name} password`,
    text: [
      "Hi,",
      "",
      "Someone (hopefully you) asked to reset the password for this account.",
      `Reset it here within the next hour: ${resetUrl}`,
      "",
      "If this wasn't you, ignore this email — your password is unchanged.",
    ].join("\n"),
    html: emailShell({
      preheader: `Reset your ${BRAND.name} password — the link works for one hour.`,
      contentHtml: [
        heading("Reset your password"),
        paragraph("Someone (hopefully you) asked to reset the password for this account."),
        paragraph("The button below works for the next hour:"),
        ctaButton("Pick a new password", resetUrl),
        paragraph(
          `<span style="color:${SLATE};font-size:13px;">If this wasn't you, just ignore this email — your password is unchanged.</span>`
        ),
      ].join(""),
    }),
  });
}

// ---- welcome -----------------------------------------------------------------

/** Sent once, right after an account is created. */
export async function sendWelcomeEmail(options: {
  to: string;
  ownerName: string;
  dashboardUrl: string;
}) {
  const { to, ownerName, dashboardUrl } = options;
  const firstName = ownerName.split(" ")[0] || ownerName;

  const step = (n: string, title: string, blurb: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      <tr>
        <td width="40" valign="top">
          <div style="width:30px;height:30px;border-radius:50%;background:#ecfdf5;color:${EMERALD};font-weight:bold;font-size:14px;text-align:center;line-height:30px;font-family:Arial,Helvetica,sans-serif;">${n}</div>
        </td>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#334155;">
          <strong style="color:${NAVY};">${escapeHtml(title)}</strong><br>${escapeHtml(blurb)}
        </td>
      </tr>
    </table>`;

  return sendEmail({
    to,
    subject: `Welcome to ${BRAND.name}, ${firstName} — your marketing agent is ready`,
    text: [
      `Hi ${firstName},`,
      "",
      `Welcome to ${BRAND.name}! Your account is ready, and so is your marketing agent.`,
      "",
      "Getting your first customers is three steps:",
      "  1. Tell it about your business — one sentence about who you want to reach.",
      "  2. Set three dials — budget, distance, and duration. That's the whole setup.",
      "  3. Hit Launch — your agent writes the ads and runs them on Google, Instagram, and Reddit.",
      "",
      `Open your dashboard: ${dashboardUrl}`,
      "",
      "No contracts. Pause anytime. We're glad you're here.",
      "",
      `— ${BRAND.name}`,
    ].join("\n"),
    html: emailShell({
      preheader: "Your account is ready — three dials and one sentence to your first campaign.",
      contentHtml: [
        heading(`Welcome, ${escapeHtml(firstName)}!`),
        paragraph(
          "Your account is ready — and so is your marketing agent. From here, getting your first customers takes about a minute:"
        ),
        step("1", "Tell it about your business", "One plain-English sentence about who you want to reach."),
        step("2", "Set three dials", "Budget, distance, and duration. That's the whole setup."),
        step("3", "Hit Launch", "Your agent writes the ads and runs them on Google, Instagram, and Reddit — all at once."),
        ctaButton("Open my dashboard", dashboardUrl),
        paragraph(
          `<span style="color:${SLATE};font-size:13px;">No contracts. Pause anytime. We're glad you're here.</span>`
        ),
      ].join(""),
    }),
  });
}

// ---- launch receipt -----------------------------------------------------------

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
  dashboardUrl?: string;
}) {
  const { to, ownerName, businessName, campaignName, budget, durationMonths, continuous, radiusMiles, zip, startDate, dashboardUrl } = options;
  const fee = Math.round(budget * 0.15);
  const total = budget + fee;
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  const firstName = ownerName.split(" ")[0] || ownerName;
  const runLength = continuous
    ? "Continuous — runs until you pause or end it"
    : `${durationMonths} month${durationMonths === 1 ? "" : "s"}`;
  const reach = `${radiusMiles} mile${radiusMiles === 1 ? "" : "s"}${zip ? ` around ${zip}` : ""}`;
  const launchDate = new Date(startDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;font-size:13px;color:${SLATE};font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td>
      <td align="right" style="padding:9px 0;font-size:14px;font-weight:bold;color:${NAVY};font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td>
    </tr>`;

  const receiptRow = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:10px 16px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:${bold ? NAVY : "#334155"};${bold ? "font-weight:bold;border-top:2px solid " + NAVY + ";" : "border-bottom:1px solid #e2e8f0;"}">${escapeHtml(label)}</td>
      <td align="right" style="padding:10px 16px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:${bold ? EMERALD : NAVY};font-weight:bold;${bold ? "border-top:2px solid " + NAVY + ";" : "border-bottom:1px solid #e2e8f0;"}">${escapeHtml(value)}</td>
    </tr>`;

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
      `  Reach: ${reach}`,
      `  Run length: ${runLength}`,
      "",
      "RECEIPT (monthly)",
      `  Ad budget (paid to ad networks):  ${usd(budget)}`,
      `  ${BRAND.name} management fee (15%):     ${usd(fee)}`,
      `  ------------------------------------------`,
      `  Total monthly billing:            ${usd(total)}`,
      "",
      "You can pause, edit, or end this campaign anytime from your dashboard — no contracts, no penalties.",
      "",
      `— ${BRAND.name}`,
    ].join("\n"),
    html: emailShell({
      preheader: `${campaignName} is in review — most campaigns go live within 24 hours.`,
      contentHtml: [
        `<div style="text-align:center;margin-bottom:6px;">
           <div style="display:inline-block;background:#ecfdf5;color:${EMERALD};font-size:12px;font-weight:bold;padding:6px 14px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;">🚀 SUBMITTED FOR REVIEW</div>
         </div>`,
        heading("Your campaign is on its way!"),
        paragraph(
          `Hi ${escapeHtml(firstName)} — your new campaign for <strong style="color:${NAVY};">${escapeHtml(businessName)}</strong> has been submitted to Google, Instagram, and Reddit. Most campaigns pass review and go live within 24 hours. Your agent takes it from here.`
        ),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
          ${detailRow("Campaign", campaignName)}
          ${detailRow("Launched", launchDate)}
          ${detailRow("Reach", reach)}
          ${detailRow("Run length", runLength)}
        </table>`,
        `<p style="margin:26px 0 8px;font-size:12px;font-weight:bold;letter-spacing:1.5px;color:${SLATE};font-family:Arial,Helvetica,sans-serif;">RECEIPT &nbsp;·&nbsp; MONTHLY</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;">
          ${receiptRow("Ad budget (paid to ad networks)", usd(budget))}
          ${receiptRow(`${BRAND.name} management fee (15%)`, usd(fee))}
          ${receiptRow("Total monthly billing", usd(total), true)}
        </table>`,
        dashboardUrl ? ctaButton("View my campaign", dashboardUrl) : "",
        paragraph(
          `<span style="color:${SLATE};font-size:13px;">You can pause, edit, or end this campaign anytime from your dashboard — no contracts, no penalties.</span>`
        ),
      ].join(""),
    }),
  });
}

// ---- performance digest ---------------------------------------------------------

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
  dashboardUrl?: string;
}) {
  const { to, businessName, periodLabel, impressions, clicks, conversions, spent, dashboardUrl } = options;

  const metricCard = (value: string, label: string) => `
    <td width="50%" style="padding:6px;">
      <div style="background:#f8fafc;border-radius:12px;padding:18px 14px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:24px;font-weight:bold;color:${NAVY};letter-spacing:-0.5px;">${value}</div>
        <div style="font-size:12px;color:${SLATE};margin-top:4px;">${escapeHtml(label)}</div>
      </div>
    </td>`;

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
      `— ${BRAND.name} (you can change email frequency in Settings)`,
    ].join("\n"),
    html: emailShell({
      preheader: `${impressions.toLocaleString()} views, ${clicks.toLocaleString()} visitors, ${conversions.toLocaleString()} leads ${periodLabel}.`,
      contentHtml: [
        heading(`How ${escapeHtml(businessName)} did ${escapeHtml(periodLabel)}`),
        paragraph("Here's what your advertising brought in while you ran your business:"),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0;">
          <tr>
            ${metricCard(impressions.toLocaleString(), "People who saw your ads")}
            ${metricCard(clicks.toLocaleString(), "Website visitors")}
          </tr>
          <tr>
            ${metricCard(conversions.toLocaleString(), "Leads & calls")}
            ${metricCard(`$${spent.toLocaleString()}`, "Spent so far")}
          </tr>
        </table>`,
        dashboardUrl ? ctaButton("See the full picture", dashboardUrl) : "",
        paragraph(
          `<span style="color:${SLATE};font-size:13px;">Your agent keeps tuning things automatically. You can change how often you get these in Settings → Email updates.</span>`
        ),
      ].join(""),
    }),
  });
}
