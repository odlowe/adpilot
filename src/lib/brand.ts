/**
 * One home for the app's identity. The product name is still being decided,
 * so nothing else in the codebase should hardcode "AdPilot" — rename the
 * whole app by setting these environment variables in Vercel (or by editing
 * the defaults here once, after the final name is chosen):
 *
 *   NEXT_PUBLIC_APP_NAME       Visible product name (pages, emails, receipts)
 *   NEXT_PUBLIC_SUPPORT_EMAIL  Footer "Contact us" address
 *   EMAIL_FROM                 Full From header, e.g. "Acme <hello@acme.com>"
 *                              (used in src/lib/email.ts)
 *   SESSION_COOKIE_NAME        Login cookie namespace. Careful: changing this
 *                              signs every existing user out once.
 *
 * Only NEXT_PUBLIC_* variables are readable in browser code, which is why
 * the visible name uses that prefix. Internal localStorage keys
 * ("adpilot_theme", "adpilot_campaign_draft") are deliberately NOT renamed —
 * they're invisible to users, and changing them would wipe saved themes and
 * in-progress drafts.
 */
export const BRAND = {
  /** The product name shown everywhere. */
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "CampaignStrike",
  /** Short slogan used in footers and email signatures. */
  tagline: "Made for main street",
  /** Footer "Contact us" mailbox. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@campaignstrike.example",
  /** Session cookie name — src/lib/auth.ts and src/middleware.ts both import this.
   * Deliberately NOT renamed with the brand: changing it signs every
   * existing user out once. Invisible to users; rename only if ever needed. */
  cookieName: process.env.SESSION_COOKIE_NAME ?? "adpilot_session",
} as const;

/**
 * Splits the name for the two-tone logo: "Campaign Strike" → ["Campaign ", "Strike"]
 * (second word in emerald); single-word names fall back to a 2-letter split
 * ("AdPilot" → ["Ad", "Pilot"]).
 */
export function brandNameParts(): [string, string] {
  const name = BRAND.name;
  const space = name.lastIndexOf(" ");
  if (space > 0) return [name.slice(0, space + 1), name.slice(space + 1)];
  // CamelCase wordmarks ("CampaignStrike") split at the last interior capital.
  for (let i = name.length - 1; i > 0; i--) {
    if (name[i] >= "A" && name[i] <= "Z") return [name.slice(0, i), name.slice(i)];
  }
  return [name.slice(0, 2), name.slice(2)];
}
