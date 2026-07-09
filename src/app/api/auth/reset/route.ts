import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { consumePasswordResetToken, updateUser } from "@/lib/db";

/** Completes a password reset: validates the token, sets the new password, logs in. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string; password?: string }
    | null;

  const token = body?.token ?? "";
  const password = body?.password ?? "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password needs to be at least 8 characters." },
      { status: 400 }
    );
  }

  const userId = token ? await consumePasswordResetToken(token) : null;
  if (!userId) {
    return NextResponse.json(
      { error: "That reset link is invalid or has expired. Request a fresh one." },
      { status: 400 }
    );
  }

  await updateUser(userId, { passwordHash: hashPassword(password) });
  createSession(userId);
  return NextResponse.json({ ok: true });
}
