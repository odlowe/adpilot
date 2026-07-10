import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBusiness, updateBusiness } from "@/lib/db";
import type { BusinessCategory } from "@/lib/types";

const CATEGORIES: BusinessCategory[] = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
];

/** Completes the signup wizard: creates the user's first business (and its
 * AI profile, when the owner didn't skip that step). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        businessName?: string;
        category?: string;
        description?: string;
        address?: string;
        phone?: string;
        website?: string;
      }
    | null;

  const name = body?.businessName?.trim() || "My Business";
  const category: BusinessCategory = CATEGORIES.includes(body?.category as BusinessCategory)
    ? (body?.category as BusinessCategory)
    : "Other";

  let business = await createBusiness({ userId: user.id, name, category });

  // Profile step (skippable): whatever they shared feeds the AI from day one.
  const profile: Record<string, string> = {};
  if (typeof body?.description === "string" && body.description.trim()) {
    profile.description = body.description.trim().slice(0, 2000);
  }
  if (typeof body?.address === "string" && body.address.trim()) {
    profile.address = body.address.trim().slice(0, 300);
  }
  if (typeof body?.phone === "string" && body.phone.trim()) {
    profile.phone = body.phone.trim().slice(0, 50);
  }
  if (typeof body?.website === "string" && body.website.trim()) {
    profile.website = body.website.trim().slice(0, 300);
  }
  if (Object.keys(profile).length > 0) {
    business = (await updateBusiness(business.id, user.id, profile)) ?? business;
  }

  return NextResponse.json({ business }, { status: 201 });
}
