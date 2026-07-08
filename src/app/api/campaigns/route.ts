import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign, getBusinessById, listCampaignsByUser } from "@/lib/db";
import type { CampaignPlan } from "@/lib/types";

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
    industryText: summary,
    targetingJson: body.plan.targeting,
    adCopyJson: body.plan.adCopy,
    platformStatuses: { google: "in_review", meta: "in_review", reddit: "in_review" },
    status: "active",
    startDate: new Date().toISOString(),
    endDate: null,
    isSample: false,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
