import { NextResponse } from "next/server";
import { verificationGate } from "@/lib/verification-gate";
import { cleanCreatives } from "@/lib/creative-validate";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign, getBusinessById, listCampaignsByUser } from "@/lib/db";
import { sendCampaignReceiptEmail } from "@/lib/email";
import { buildGoogleAdsPlan, buildPmaxFromBasics, sanitizePmax } from "@/lib/google-ads";
import {
  CAMPAIGN_GOAL_KEYS,
  type CampaignGoal,
  type CampaignPlan,
  type GoogleAdsCampaignPlan,
  type Platform,
  type PlatformSplit,
} from "@/lib/types";

/** Normalize any three numbers into whole percentages summing to 100. */
function normalizeSplit(input?: Partial<PlatformSplit>): PlatformSplit {
  const raw: Record<Platform, number> = {
    google: Math.max(0, Number(input?.google) || 0),
    meta: Math.max(0, Number(input?.meta) || 0),
    reddit: Math.max(0, Number(input?.reddit) || 0),
  };
  const total = raw.google + raw.meta + raw.reddit;
  if (total <= 0) return { google: 34, meta: 33, reddit: 33 };
  const google = Math.round((raw.google / total) * 100);
  const meta = Math.round((raw.meta / total) * 100);
  return { google, meta, reddit: 100 - google - meta };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const unverified = verificationGate(user);
  if (unverified) return unverified;
  return NextResponse.json({ campaigns: await listCampaignsByUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        businessId?: string;
        budget?: number;
        zip?: string;
        durationWeeks?: number;
        continuous?: boolean;
        manualMode?: boolean;
        platformSplit?: Partial<PlatformSplit>;
        siteCategories?: string[];
        customSites?: string[];
        creativeUrl?: string | null;
        creatives?: unknown;
        industryText?: string;
        plan?: CampaignPlan;
        // Google wizard answers
        goal?: string;
        landingPageUrl?: string;
        enhancePageUrls?: unknown;
        bidStrategy?: string;
        targetCpa?: number;
        paidForBy?: string;
      }
    | null;

  if (!body?.plan || !body.industryText || !body.budget || !body.businessId) {
    return NextResponse.json(
      { error: "Generate a campaign preview before launching." },
      { status: 400 }
    );
  }

  const business = await getBusinessById(body.businessId);
  if (!business || business.userId !== user.id) {
    return NextResponse.json({ error: "That business wasn't found." }, { status: 404 });
  }

  const summary = body.industryText.trim();
  const budget = Math.min(5000, Math.max(250, Math.round(body.budget)));
  const zip = body.zip?.trim().slice(0, 32) ?? "";
  const creatives = cleanCreatives(body.creatives);

  // ---- assemble the Google Performance Max plan from the wizard's answers ----
  const goal: CampaignGoal = CAMPAIGN_GOAL_KEYS.includes(body.goal as CampaignGoal)
    ? (body.goal as CampaignGoal)
    : "purchases";
  const bidStrategy: GoogleAdsCampaignPlan["bidStrategy"] =
    body.bidStrategy === "maximize_conversion_value"
      ? "maximize_conversion_value"
      : "maximize_conversions";
  const targetCpa =
    typeof body.targetCpa === "number" && Number.isFinite(body.targetCpa) && body.targetCpa > 0
      ? Math.min(10_000, body.targetCpa)
      : undefined;
  const enhancePageUrls = Array.isArray(body.enhancePageUrls)
    ? body.enhancePageUrls
        .filter((u): u is string => typeof u === "string")
        .map((u) => u.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const paidForBy =
    business.category === "Political Campaign" && typeof body.paidForBy === "string"
      ? body.paidForBy.trim().slice(0, 120) || null
      : null;

  // US election law: political ads must carry a "Paid for by" disclaimer.
  if (business.category === "Political Campaign" && !paidForBy) {
    return NextResponse.json(
      { error: 'Political campaigns need a "Paid for by" line before they can launch.' },
      { status: 400 }
    );
  }

  // The preview editor may have tweaked the assets — sanitize what came back
  // (char limits are Google's hard rules) and backfill if it's missing/broken.
  const pmax =
    sanitizePmax(body.plan.pmax) ??
    buildPmaxFromBasics(body.plan.adCopy, body.plan.targeting, business.name);

  const googleAdsJson = buildGoogleAdsPlan({
    goal,
    landingPageUrl: typeof body.landingPageUrl === "string" ? body.landingPageUrl.slice(0, 300) : "",
    enhancePageUrls,
    bidStrategy,
    targetCpa,
    monthlyBudget: budget,
    zip,
    radiusMiles: body.plan.targeting.radiusMiles,
    pmax,
    business,
    creatives,
    paidForBy,
  });

  const campaign = await createCampaign({
    userId: user.id,
    businessId: business.id,
    // Short demographic label, not the whole customer description —
    // "Main St. Bakery — eco-minded local moms", with a clipped fallback.
    name: `${business.name} — ${
      body.plan.targeting.audienceLabel?.trim().slice(0, 48) ||
      `${summary.slice(0, 44)}${summary.length > 44 ? "…" : ""}`
    }`,
    budget,
    zip,
    durationWeeks: Math.min(26, Math.max(1, Math.round(body.durationWeeks ?? 4))),
    continuous: Boolean(body.continuous),
    manualMode: Boolean(body.manualMode),
    platformSplit: body.manualMode
      ? normalizeSplit(body.platformSplit)
      : { google: 34, meta: 33, reddit: 33 },
    siteCategories: (body.siteCategories ?? []).map((s) => String(s).slice(0, 60)).slice(0, 20),
    customSites: (body.customSites ?? []).map((s) => String(s).slice(0, 120)).slice(0, 25),
    creativeUrl:
      typeof body.creativeUrl === "string" ? body.creativeUrl : creatives[0]?.url ?? null,
    creativesJson: creatives,
    industryText: summary,
    targetingJson: body.plan.targeting,
    adCopyJson: body.plan.adCopy,
    platformStatuses: { google: "in_review", meta: "in_review", reddit: "in_review" },
    status: "active",
    startDate: new Date().toISOString(),
    endDate: null,
    isSample: false,
    googleAdsJson,
    googleCampaignId: null,
    googleStatus: null,
  });

  // Confirmation + receipt. Never let an email hiccup break the launch itself.
  try {
    await sendCampaignReceiptEmail({
      dashboardUrl: `${new URL(request.url).origin}/dashboard`,
      to: user.email,
      ownerName: user.fullName,
      businessName: business.name,
      campaignName: campaign.name,
      budget: campaign.budget,
      durationWeeks: campaign.durationWeeks,
      continuous: campaign.continuous,
      radiusMiles: campaign.targetingJson.radiusMiles,
      zip: campaign.zip,
      startDate: campaign.startDate,
    });
  } catch {
    // Email failed — the campaign is still launched; digests will catch them up.
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
