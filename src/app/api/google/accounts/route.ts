import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleAdsSearch, isGoogleAdsConfigured, listClientAccounts } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

/**
 * The "where is everything, really?" page. Asks the API directly for the
 * account tree under the manager AND the campaigns inside the publish
 * target — the UI's picker can lag or filter; the API cannot lie.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: "Google Ads isn't connected — see /api/google/status." },
      { status: 501 }
    );
  }

  const manager = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "";
  const target = process.env.GOOGLE_ADS_TEST_CUSTOMER_ID ?? "";

  let accounts: unknown = null;
  let accountsError: string | null = null;
  try {
    accounts = await listClientAccounts(manager);
  } catch (err) {
    accountsError = err instanceof Error ? err.message : "unknown error";
  }

  let campaigns: unknown = null;
  let campaignsError: string | null = null;
  if (target) {
    try {
      const rows = await googleAdsSearch(
        target,
        "SELECT campaign.id, campaign.name, campaign.status FROM campaign"
      );
      campaigns = rows.map((row) => {
        const c = (row.campaign ?? {}) as { id?: string | number; name?: string; status?: string };
        return { id: String(c.id ?? "?"), name: c.name ?? "(unnamed)", status: c.status ?? "?" };
      });
    } catch (err) {
      campaignsError = err instanceof Error ? err.message : "unknown error";
    }
  }

  return NextResponse.json({
    managerAccountInVercel: manager,
    accountsUnderThatManager: accounts,
    ...(accountsError ? { accountsError } : {}),
    publishTargetInVercel: target,
    campaignsInsidePublishTarget: campaigns,
    ...(campaignsError ? { campaignsError } : {}),
    howToRead:
      "accountsUnderThatManager is the true family tree. campaignsInsidePublishTarget lists what actually lives in the account your site publishes to — if your campaign is there, the UI was just showing you a different account or filtering it out.",
  });
}
