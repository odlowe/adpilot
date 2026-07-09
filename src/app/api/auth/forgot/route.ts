import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/db";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";

/**
 * Starts a password reset. Always responds identically whether or not the
 * email exists (no account fishing). With no email service configured, the
 * reset link is returned directly so the flow works in development/demo.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
  }

  const token = await createPasswordResetToken(email);
  const message = "If that email has an account, a reset link is on its way.";

  if (!token) {
    return NextResponse.json({ message });
  }

  const origin = new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}`;

  if (isEmailConfigured()) {
    await sendPasswordResetEmail(email, resetUrl);
    return NextResponse.json({ message });
  }

  // Dev/demo mode: no email service yet, hand the link back directly.
  console.info(`[password-reset:dev] ${email} → ${resetUrl}`);
  return NextResponse.json({ message, devResetUrl: resetUrl });
}
