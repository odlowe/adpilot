import { NextResponse } from "next/server";
import { verificationGate } from "@/lib/verification-gate";
import { rateLimit } from "@/lib/ratelimit";
import { generateCampaignPlan, isAiConfigured, type PlanOptions } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessById } from "@/lib/db";
import { CAMPAIGN_GOAL_KEYS, type CampaignGoal } from "@/lib/types";

// Real model calls can take a while — give the real writer every chance
// before the backup steps in.
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const unverified = verificationGate(user);
  if (unverified) return unverified;

  const limited = rateLimit(request, "generate", 12, 60000, user.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as
    | {
        intentText?: string;
        budget?: number;
        radiusMiles?: number;
        businessId?: string;
        goal?: string;
        paidForBy?: string;
      }
    | null;

  let intentText = body?.intentText?.trim() ?? "";
  const opts: PlanOptions = {};

  if (CAMPAIGN_GOAL_KEYS.includes(body?.goal as CampaignGoal)) {
    opts.goal = body?.goal as CampaignGoal;
  }
  if (typeof body?.paidForBy === "string" && body.paidForBy.trim()) {
    opts.paidForBy = body.paidForBy.trim().slice(0, 120);
  }

  // Enrich with the business profile so the agent has more to go on.
  if (body?.businessId) {
    const business = await getBusinessById(body.businessId);
    if (business && business.userId === user.id) {
      opts.businessName = business.name;
      opts.category = business.category;
      const profileBits = [business.description, business.address].filter(Boolean).join(". ");
      if (profileBits) intentText = `${intentText}. About the business: ${profileBits}`;
    }
  }
  const budget = clamp(Number(body?.budget) || 0, 250, 5000);
  const radiusMiles = clamp(Number(body?.radiusMiles) || 0, 1, 50);

  if (intentText.length < 12) {
    return NextResponse.json(
      { error: "Tell us a little more about your business and customers first." },
      { status: 400 }
    );
  }

  // With a real model the latency is real; without one, simulate the agent
  // thinking so the UI can show its working state.
  if (!isAiConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }

  const plan = await generateCampaignPlan(intentText, budget, radiusMiles, opts);
  return NextResponse.json({ plan });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
