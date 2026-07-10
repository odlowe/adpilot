import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCampaignsByUser, updateCampaign, updateCampaignStatus } from "@/lib/db";
import { cleanCreatives } from "@/lib/creative-validate";
import type { PlatformSplit } from "@/lib/types";

const ACTIONS = {
  pause: "paused",
  resume: "active",
  end: "completed",
} as const;

const cleanList = (values: unknown, maxItems: number, maxLength: number): string[] | undefined =>
  Array.isArray(values)
    ? values
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems)
    : undefined;

/** Clamp each share to 0–100 and force the three to add up to exactly 100. */
function cleanSplit(split: unknown): PlatformSplit | undefined {
  if (!split || typeof split !== "object") return undefined;
  const raw = split as Record<string, unknown>;
  const clamp = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
  const google = clamp(raw.google);
  const meta = clamp(raw.meta);
  const reddit = clamp(raw.reddit);
  const total = google + meta + reddit;
  if (total === 0) return undefined;
  const scaledGoogle = Math.min(100, Math.round((google / total) * 100));
  const scaledMeta = Math.min(100 - scaledGoogle, Math.round((meta / total) * 100));
  return { google: scaledGoogle, meta: scaledMeta, reddit: 100 - scaledGoogle - scaledMeta };
}

/**
 * Campaign controls and edits:
 *  - { action: "pause" | "resume" | "end" } changes status
 *  - { updates: { name, budget, zip, durationMonths, continuous, radiusMiles,
 *      googleKeywords, platformSplit, siteCategories, customSites } } edits fields
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
          radiusMiles?: number;
          googleKeywords?: string[];
          platformSplit?: PlatformSplit;
          siteCategories?: string[];
          customSites?: string[];
          creatives?: unknown;
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

    // Choosing a split or specific placements means the owner took the wheel.
    const split = cleanSplit(body.updates.platformSplit);
    if (split) {
      patch.platformSplit = split;
      patch.manualMode = true;
    }
    const siteCategories = cleanList(body.updates.siteCategories, 20, 60);
    if (siteCategories !== undefined) {
      patch.siteCategories = siteCategories;
      patch.manualMode = true;
    }
    const customSites = cleanList(body.updates.customSites, 20, 100);
    if (customSites !== undefined) {
      patch.customSites = customSites;
      patch.manualMode = true;
    }

    // Full replacement of the campaign's image set (from the image manager).
    if (body.updates.creatives !== undefined) {
      const creatives = cleanCreatives(body.updates.creatives);
      patch.creativesJson = creatives;
      patch.creativeUrl = creatives[0]?.url ?? null;
    }

    // Targeting lives inside targetingJson — merge with what's there now.
    const keywords = cleanList(body.updates.googleKeywords, 30, 80);
    const radius =
      body.updates.radiusMiles !== undefined
        ? Math.min(50, Math.max(1, Math.round(Number(body.updates.radiusMiles) || 1)))
        : undefined;
    if (keywords !== undefined || radius !== undefined) {
      const existing = (await listCampaignsByUser(user.id)).find((c) => c.id === params.id);
      if (!existing) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }
      patch.targetingJson = {
        ...existing.targetingJson,
        ...(radius !== undefined ? { radiusMiles: radius } : {}),
        ...(keywords !== undefined ? { googleKeywords: keywords } : {}),
      };
    }

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
