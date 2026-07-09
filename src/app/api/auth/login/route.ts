import { NextResponse } from "next/server";
import { createSession, toSafeUser, verifyPassword } from "@/lib/auth";
import { clearLoginFailures, findUserByEmail, recordLoginFailure } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  const user = email ? await findUserByEmail(email) : null;

  // Cooldown: 3 wrong passwords in a row locks the account for 10 minutes.
  if (user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    const minutesLeft = Math.ceil(
      (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
    );
    return NextResponse.json(
      {
        error: `Too many wrong attempts. For your security, try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} — or reset your password now.`,
      },
      { status: 429 }
    );
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      const { locked } = await recordLoginFailure(user.id);
      if (locked) {
        return NextResponse.json(
          {
            error:
              "That's 3 wrong attempts — login is paused for 10 minutes. You can reset your password right away instead.",
          },
          { status: 429 }
        );
      }
    }
    return NextResponse.json(
      { error: "That email and password don't match. Give it another try." },
      { status: 401 }
    );
  }

  await clearLoginFailures(user.id);
  createSession(user.id);
  return NextResponse.json({ user: toSafeUser(user) });
}
