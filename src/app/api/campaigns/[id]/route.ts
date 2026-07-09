import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateCampaign, updateCampaignStatus } from "@/lib/db";

const ACTIONS = {
  pause: "paused",
  resume: "active",
  end: "completed",
} as const;

/**
 * Campaign controls and edits:
 *  - { action: "pause" | "resume" | "end" } changes status
 *  - { updates: { name, budget, zip, durationMonths, continuous } } edits fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: keyof typeof ACTIONS;
        updates?: {
          name?: string;
          budget?: number;
          zip?: string;
          durationMonths?: number;
          continuous?: boolean;
        };
      }
    | null;

  if (body?.updates) {
    const patch: Parameters<typeof updateCampaign>[2] = {};
    if (typeof body.updates.name === "string" && body.updates.name.trim().length >= 2) {
      patch.name = body.updates.name.trim().slice(0, 120);
    }
    if (body.updates.budget !== undefined) {
      patch.budget = Math.min(5000, Math.max(250, Math.round(Number(body.updates.budget) || 0)));
    }
    if (typeof body.updates.zip === "string") patch.zip = body.updates.zip.trim().slice(0, 32);
    if (body.updates.durationMonths !== undefined) {
      patch.durationMonths = Math.min(6, Math.max(1, Math.round(Number(body.updates.durationMonths) || 1)));
    }
    if (body.updates.continuous !== undefined) patch.continuous = Boolean(body.updates.continuous);

    const campaign = await updateCampaign(params.id, user.id, patch);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  }

  const status = body?.action ? ACTIONS[body.action] : undefined;
  if (!status) {
    return NextResponse.json(
      { error: "Send an action (pause/resume/end) or updates." },
      { status: 400 }
    );
  }

  const campaign = await updateCampaignStatus(params.id, user.id, status);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}
