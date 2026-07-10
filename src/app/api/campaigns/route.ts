import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign, getBusinessById, listCampaignsByUser } from "@/lib/db";
import { sendCampaignReceiptEmail } from "@/lib/email";
import type { CampaignPlan, Platform, PlatformSplit } from "@/lib/types";

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
        durationMonths?: number;
        continuous?: boolean;
        manualMode?: boolean;
        platformSplit?: Partial<PlatformSplit>;
        siteCategories?: string[];
        customSites?: string[];
        creativeUrl?: string | null;
        industryText?: string;
        plan?: CampaignPlan;
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
  const campaign = await createCampaign({
    userId: user.id,
    businessId: business.id,
    name: `${business.name} — ${summary.slice(0, 44)}${summary.length > 44 ? "…" : ""}`,
    budget: Math.min(5000, Math.max(250, Math.round(body.budget))),
    zip: body.zip?.trim().slice(0, 32) ?? "",
    durationMonths: Math.min(6, Math.max(1, Math.round(body.durationMonths ?? 1))),
    continuous: Boolean(body.continuous),
    manualMode: Boolean(body.manualMode),
    platformSplit: body.manualMode
      ? normalizeSplit(body.platformSplit)
      : { google: 34, meta: 33, reddit: 33 },
    siteCategories: (body.siteCategories ?? []).map((s) => String(s).slice(0, 60)).slice(0, 20),
    customSites: (body.customSites ?? []).map((s) => String(s).slice(0, 120)).slice(0, 25),
    creativeUrl: typeof body.creativeUrl === "string" ? body.creativeUrl : null,
    industryText: summary,
    targetingJson: body.plan.targeting,
    adCopyJson: body.plan.adCopy,
    platformStatuses: { google: "in_review", meta: "in_review", reddit: "in_review" },
    status: "active",
    startDate: new Date().toISOString(),
    endDate: null,
    isSample: false,
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
      durationMonths: campaign.durationMonths,
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
