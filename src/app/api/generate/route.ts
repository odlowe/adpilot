import { NextResponse } from "next/server";
import { generateCampaignPlan } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { intentText?: string; budget?: number; radiusMiles?: number }
    | null;

  const intentText = body?.intentText?.trim() ?? "";
  const budget = clamp(Number(body?.budget) || 0, 250, 5000);
  const radiusMiles = clamp(Number(body?.radiusMiles) || 0, 1, 50);

  if (intentText.length < 12) {
    return NextResponse.json(
      { error: "Tell us a little more about your business and customers first." },
      { status: 400 }
    );
  }

  // Simulate the agent thinking so the UI can show its working state.
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const plan = await generateCampaignPlan(intentText, budget, radiusMiles);
  return NextResponse.json({ plan });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
