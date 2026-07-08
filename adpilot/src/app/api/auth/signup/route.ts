import { NextResponse } from "next/server";
import { createSession, hashPassword, toSafeUser } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password needs to be at least 8 characters." },
      { status: 400 }
    );
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "Looks like you already have an account — try logging in instead." },
      { status: 409 }
    );
  }

  const user = await createUser({ email, passwordHash: hashPassword(password) });
  createSession(user.id);
  return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
}
