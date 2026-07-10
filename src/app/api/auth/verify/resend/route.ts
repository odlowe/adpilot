import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEmailVerificationToken } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";

/** "Resend the confirmation email" button in the dashboard banner. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const limited = rateLimit(request, "verify-resend", 3, 10 * 60_000, user.id);
  if (limited) return limited;

  const origin = new URL(request.url).origin;
  const token = await createEmailVerificationToken(user.id);
  await sendVerificationEmail(
    user.email,
    user.fullName.split(" ")[0] || user.fullName,
    `${origin}/api/auth/verify?token=${token}`
  );
  return NextResponse.json({ ok: true });
}
