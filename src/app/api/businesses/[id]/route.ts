import { NextResponse } from "next/server";
import { cleanBranding } from "@/lib/business-patch";
import { getCurrentUser } from "@/lib/auth";
import { deleteBusiness, listBusinessesByUser, updateBusiness } from "@/lib/db";
import type { BusinessCategory } from "@/lib/types";

const CATEGORIES: BusinessCategory[] = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
];

/** Edit a business's name, category, and profile details. */
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
        name?: string;
        category?: string;
        description?: string;
        address?: string;
        phone?: string;
        website?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const patch: Parameters<typeof updateBusiness>[2] = {};
  if (typeof body.name === "string") {
    if (body.name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter a business name." }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if (typeof body.category === "string" && CATEGORIES.includes(body.category as BusinessCategory)) {
    patch.category = body.category as BusinessCategory;
  }
  if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 2000);
  if (typeof body.address === "string") patch.address = body.address.trim().slice(0, 300);
  if (typeof body.phone === "string") patch.phone = body.phone.trim().slice(0, 40);
  if (typeof body.website === "string") patch.website = body.website.trim().slice(0, 200);
  if ((body as { brandingImages?: unknown }).brandingImages !== undefined) {
    patch.brandingJson = cleanBranding((body as { brandingImages?: unknown }).brandingImages);
  }

  const business = await updateBusiness(params.id, user.id, patch);
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  return NextResponse.json({ business });
}

/** Delete a business and all its campaigns. The last business can't be deleted. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const businesses = await listBusinessesByUser(user.id);
  if (businesses.length <= 1) {
    return NextResponse.json(
      { error: "You need at least one business — add another before deleting this one." },
      { status: 400 }
    );
  }

  const ok = await deleteBusiness(params.id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
