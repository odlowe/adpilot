import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { generateCampaignPlan, isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessById } from "@/lib/db";

// Real model calls can take a while — allow up to 30s on Vercel.
export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const limited = rateLimit(request, "generate", 12, 60000, user.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as
    | { intentText?: string; budget?: number; radiusMiles?: number; businessId?: string }
    | null;

  let intentText = body?.intentText?.trim() ?? "";

  // Enrich with the business profile so the agent has more to go on.
  if (body?.businessId) {
    const business = await getBusinessById(body.businessId);
    if (business && business.userId === user.id) {
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

  const plan = await generateCampaignPlan(intentText, budget, radiusMiles);
  return NextResponse.json({ plan });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
