import { NextResponse } from "next/server";
import { verificationGate } from "@/lib/verification-gate";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign, listCampaignsByUser } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

/**
 * "Rerun campaign" from Past Ad Buys: clones a completed campaign — same
 * copy, targeting, images, budget, and settings — as a fresh active
 * campaign starting today. The client then sends the owner through Stripe
 * Checkout for the new run (when billing is switched on).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const unverified = verificationGate(user);
  if (unverified) return unverified;

  const limited = rateLimit(request, "rerun", 10, 10 * 60_000, user.id);
  if (limited) return limited;

  const source = (await listCampaignsByUser(user.id)).find((c) => c.id === params.id);
  if (!source) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (source.status !== "completed") {
    return NextResponse.json(
      { error: "Only past campaigns can be rerun — this one is still going." },
      { status: 400 }
    );
  }

  // Strip any previous "(rerun)" tag so names don't snowball.
  const baseName = source.name.replace(/\s*\(rerun( \d+)?\)$/i, "");

  const campaign = await createCampaign({
    userId: user.id,
    businessId: source.businessId,
    name: `${baseName.slice(0, 110)} (rerun)`,
    budget: source.budget,
    zip: source.zip,
    durationMonths: source.durationMonths,
    continuous: source.continuous,
    manualMode: source.manualMode,
    platformSplit: { ...source.platformSplit },
    siteCategories: [...source.siteCategories],
    customSites: [...source.customSites],
    creativeUrl: source.creativeUrl,
    creativesJson: [...(source.creativesJson ?? [])],
    industryText: source.industryText,
    targetingJson: { ...source.targetingJson },
    adCopyJson: { ...source.adCopyJson },
    platformStatuses: { google: "in_review", meta: "in_review", reddit: "in_review" },
    status: "active",
    startDate: new Date().toISOString(),
    endDate: null,
    isSample: false,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
