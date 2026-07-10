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
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "AdPilot",
  /** Short slogan used in footers and email signatures. */
  tagline: "Made for main street",
  /** Footer "Contact us" mailbox. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@adpilot.example",
  /** Session cookie name — src/lib/auth.ts and src/middleware.ts both import this. */
  cookieName: process.env.SESSION_COOKIE_NAME ?? "adpilot_session",
} as const;
