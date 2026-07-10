import { NextResponse } from "next/server";
import { createSession, hashPassword, toSafeUser } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; fullName?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const fullName = body?.fullName?.trim() ?? "";

  if (fullName.length < 2) {
    return NextResponse.json({ error: "Please tell us your name." }, { status: 400 });
  }
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

  const user = await createUser({ email, passwordHash: hashPassword(password), fullName });
  createSession(user.id);

  // Welcome email — never let an email hiccup break the signup itself.
  try {
    const origin = new URL(request.url).origin;
    await sendWelcomeEmail({
      to: user.email,
      ownerName: user.fullName,
      dashboardUrl: `${origin}/dashboard`,
    });
  } catch {
    // Signup still succeeds without the email.
  }

  return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
}
