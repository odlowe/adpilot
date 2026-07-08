import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBusiness, listBusinessesByUser } from "@/lib/db";
import type { BusinessCategory } from "@/lib/types";

const CATEGORIES: BusinessCategory[] = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  return NextResponse.json({ businesses: await listBusinessesByUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; category?: string }
    | null;

  const name = body?.name?.trim() ?? "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter a business name." }, { status: 400 });
  }
  const category: BusinessCategory = CATEGORIES.includes(body?.category as BusinessCategory)
    ? (body?.category as BusinessCategory)
    : "Other";

  const business = await createBusiness({ userId: user.id, name, category });
  return NextResponse.json({ business }, { status: 201 });
}
