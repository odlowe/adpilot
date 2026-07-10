import { NextResponse } from "next/server";
import type { SafeUser } from "./types";

/**
 * The hard email-verification gate. OFF by default so live demos with
 * fresh signups never stall waiting for an inbox. Flip it on in Vercel:
 *   REQUIRE_EMAIL_VERIFICATION=true
 * Once on, unverified accounts can't create/rerun campaigns or spend AI
 * budget — they see a clear message pointing at the dashboard banner.
 */
export function verificationGate(user: SafeUser): NextResponse | null {
  if (process.env.REQUIRE_EMAIL_VERIFICATION !== "true") return null;
  if (user.emailVerified) return null;
  return NextResponse.json(
    {
      error:
        "Please confirm your email first — we sent you a link (the banner on your dashboard can resend it).",
    },
    { status: 403 }
  );
}
