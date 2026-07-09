import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateCampaignStatus } from "@/lib/db";

const ACTIONS = {
  pause: "paused",
  resume: "active",
  end: "completed",
} as const;

/** Campaign controls: pause, resume, or permanently end a campaign. */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: keyof typeof ACTIONS }
    | null;

  const status = body?.action ? ACTIONS[body.action] : undefined;
  if (!status) {
    return NextResponse.json(
      { error: "Choose an action: pause, resume, or end." },
      { status: 400 }
    );
  }

  const campaign = await updateCampaignStatus(params.id, user.id, status);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}
