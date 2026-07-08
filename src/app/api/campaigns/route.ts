import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign, listCampaignsByUser } from "@/lib/db";
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
    | { budget?: number; industryText?: string; plan?: CampaignPlan }
    | null;

  if (!body?.plan || !body.industryText || !body.budget) {
    return NextResponse.json(
      { error: "Generate a campaign preview before launching." },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    userId: user.id,
    budget: body.budget,
    industryText: body.industryText,
    targetingJson: body.plan.targeting,
    adCopyJson: body.plan.adCopy,
    platformStatuses: { google: "in_review", meta: "in_review", reddit: "in_review" },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
