import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { businessName?: string; industry?: string }
    | null;

  const updated = await updateUser(user.id, {
    businessName: body?.businessName?.trim() || null,
    industry: body?.industry?.trim() || null,
  });

  return NextResponse.json({ ok: true, businessName: updated?.businessName ?? null });
}
