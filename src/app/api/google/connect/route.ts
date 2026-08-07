import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildConsentUrl, oauthClientConfigured } from "@/lib/google-ads";
import { requestOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

/**
 * Step 1 of connecting Google Ads: sends the owner to Google's consent page.
 * Google bounces back to /api/google/callback with a one-time code.
 * Sign in with the SAME Google account that owns the Ads manager account.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", requestOrigin(request)));
  }
  if (!oauthClientConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth isn't configured yet. Add GOOGLE_ADS_OAUTH_CLIENT_ID and GOOGLE_ADS_OAUTH_CLIENT_SECRET in Vercel first, then redeploy and try again.",
      },
      { status: 501 }
    );
  }

  const origin = requestOrigin(request);
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildConsentUrl(`${origin}/api/google/callback`, state));
  response.cookies.set("adpilot_gstate", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return response;
}
