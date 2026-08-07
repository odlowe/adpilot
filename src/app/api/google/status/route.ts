import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleAdsConfigured, listAccessibleCustomers } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

/**
 * The connection health check. Visit after each setup step — every line
 * should flip to true, and accessibleAccounts should list the test accounts.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const checklist = {
    developerToken: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
    oauthClientId: Boolean(process.env.GOOGLE_ADS_OAUTH_CLIENT_ID),
    oauthClientSecret: Boolean(process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET),
    refreshToken: Boolean(process.env.GOOGLE_ADS_REFRESH_TOKEN),
    managerAccountId: Boolean(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
    testAccountId: Boolean(process.env.GOOGLE_ADS_TEST_CUSTOMER_ID),
  };

  if (!isGoogleAdsConfigured()) {
    const missing = Object.entries(checklist)
      .filter(([, ok]) => !ok)
      .map(([key]) => key);
    return NextResponse.json({
      connected: false,
      checklist,
      nextStep: `Still missing: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables, redeploy, and refresh this page.`,
    });
  }

  try {
    const accounts = await listAccessibleCustomers();
    return NextResponse.json({
      connected: true,
      checklist,
      accessibleAccounts: accounts,
      note: "If your test manager and test client account ids appear above, publishing will work. Campaigns are always created PAUSED.",
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      checklist,
      apiError: err instanceof Error ? err.message : "Unknown error",
      hint: "All variables are set but Google rejected the call — most often the refresh token was minted with a different Google account than the one that owns the manager account, or the developer token is wrong.",
    });
  }
}
