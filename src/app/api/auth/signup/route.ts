import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { createSession, hashPassword, toSafeUser } from "@/lib/auth";
import { createEmailVerificationToken, createUser, findUserByEmail } from "@/lib/db";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  const limited = rateLimit(request, "signup", 5, 600000);
  if (limited) return limited;

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

  // Welcome + verification emails — never let an email hiccup break signup.
  try {
    const origin = new URL(request.url).origin;
    await sendWelcomeEmail({
      to: user.email,
      ownerName: user.fullName,
      dashboardUrl: `${origin}/dashboard`,
    });
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(
      user.email,
      user.fullName.split(" ")[0] || user.fullName,
      `${origin}/api/auth/verify?token=${token}`
    );
  } catch {
    // Signup still succeeds without the emails.
  }

  return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
}
