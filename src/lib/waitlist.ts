/**
 * Waitlist mode: while it's on, only allowlisted emails get real accounts —
 * everyone else's signup is STORED (name, email, password) but they land on
 * /waitlist instead of the dashboard, with a friendly email confirming their
 * spot. Flip it off later with a single Vercel env var:
 *
 *   WAITLIST_MODE=off              → doors open for everyone
 *   WAITLIST_ALLOWED_EMAILS=a,b,c  → add more allowlisted emails (comma-sep)
 */
const ALWAYS_ALLOWED = ["odlowe@gmail.com"];

export function isWaitlisted(email: string): boolean {
  if (process.env.WAITLIST_MODE === "off") return false;
  const extra = (process.env.WAITLIST_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !ALWAYS_ALLOWED.concat(extra).includes(email.trim().toLowerCase());
}
