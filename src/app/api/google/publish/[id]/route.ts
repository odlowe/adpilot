import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessById, listCampaignsByUser, updateCampaign } from "@/lib/db";
import { isGoogleAdsConfigured, publishCampaignToGoogle, publishGaps } from "@/lib/google-ads";
import { rateLimit } from "@/lib/ratelimit";

// Uploading images to Google can take a moment.
export const maxDuration = 60;

/**
 * Pushes a campaign's stored Google plan to the TEST account as a real
 * (paused) Performance Max campaign. Deliberately refuses to run without
 * GOOGLE_ADS_TEST_CUSTOMER_ID — production accounts come later, after
 * Google grants Basic access.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const limited = rateLimit(request, "google-publish", 5, 10 * 60_000, user.id);
  if (limited) return limited;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: "Google Ads isn't connected yet — check /api/google/status for what's missing." },
      { status: 501 }
    );
  }
  const testCustomerId = process.env.GOOGLE_ADS_TEST_CUSTOMER_ID;
  if (!testCustomerId) {
    return NextResponse.json(
      { error: "GOOGLE_ADS_TEST_CUSTOMER_ID isn't set — publishing only targets the test account for now." },
      { status: 501 }
    );
  }

  const campaign = (await listCampaignsByUser(user.id)).find((c) => c.id === params.id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (!campaign.googleAdsJson) {
    return NextResponse.json(
      { error: "This campaign predates the Google wizard — recreate it to get a Google plan." },
      { status: 400 }
    );
  }
  if (campaign.googleCampaignId) {
    return NextResponse.json(
      { error: `Already on Google (campaign ${campaign.googleCampaignId}).` },
      { status: 409 }
    );
  }

  // The Google plan is a snapshot from launch time — if the owner fixed
  // their business profile since (added a logo, new brand images), pull the
  // freshest versions in rather than forcing them to recreate the campaign.
  let plan = campaign.googleAdsJson;
  const business = await getBusinessById(campaign.businessId);
  if (business && business.userId === user.id) {
    const logo = business.brandingJson.find((b) => b.label === "Logo")?.url ?? null;
    if (!plan.squareLogoUrl && logo) plan = { ...plan, squareLogoUrl: logo };
    const youtube = business.linkedAccountsJson?.youtube?.trim();
    if (plan.videoUrls.length === 0 && youtube) plan = { ...plan, videoUrls: [youtube] };
  }

  const gaps = publishGaps(plan);
  if (gaps.length > 0) {
    return NextResponse.json(
      { error: `Before this can go to Google it needs: ${gaps.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const result = await publishCampaignToGoogle(
      testCustomerId,
      campaign.name,
      campaign.zip,
      campaign.targetingJson.radiusMiles,
      plan
    );
    const updated = await updateCampaign(campaign.id, user.id, {
      googleAdsJson: plan,
      googleCampaignId: result.campaignId,
      googleStatus: "PAUSED",
    });
    return NextResponse.json({
      ok: true,
      googleCampaignId: result.campaignId,
      warnings: result.warnings,
      campaign: updated,
      note: "Created PAUSED in the TEST account — it can't spend money there.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google rejected the campaign." },
      { status: 502 }
    );
  }
}
