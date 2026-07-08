import { NextResponse } from "next/server";
import { createSession, toSafeUser, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  const user = email ? await findUserByEmail(email) : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "That email and password don't match. Give it another try." },
      { status: 401 }
    );
  }

  createSession(user.id);
  return NextResponse.json({ user: toSafeUser(user) });
}
