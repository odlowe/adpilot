import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClientAccountUnderManager, isGoogleAdsConfigured } from "@/lib/google-ads";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * One-click fix for CUSTOMER_NOT_ENABLED: mints a brand-new client account
 * under the TEST manager via the API. API-created accounts are enabled
 * immediately (no signup wizard). Visit in the browser while logged in;
 * copy the returned id into GOOGLE_ADS_TEST_CUSTOMER_ID and redeploy.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const limited = rateLimit(request, "google-create-client", 3, 10 * 60_000, user.id);
  if (limited) return limited;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: "Google Ads isn't connected yet — check /api/google/status first." },
      { status: 501 }
    );
  }
  const manager = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (!manager) {
    return NextResponse.json(
      { error: "GOOGLE_ADS_LOGIN_CUSTOMER_ID isn't set." },
      { status: 501 }
    );
  }

  try {
    const id = await createClientAccountUnderManager(manager, "CampaignStrike Test Client (API)");
    return NextResponse.json({
      ok: true,
      newAccountId: id,
      nextStep: `In Vercel, set GOOGLE_ADS_TEST_CUSTOMER_ID to ${id} (replacing the old value), redeploy, then push your campaign again.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google refused to create the account." },
      { status: 502 }
    );
  }
}
