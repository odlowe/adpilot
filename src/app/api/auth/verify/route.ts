import { NextResponse } from "next/server";
import { consumeEmailVerificationToken, updateUser } from "@/lib/db";

/** The link in the "confirm your email" message lands here. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const userId = token ? await consumeEmailVerificationToken(token) : null;
  if (userId) {
    await updateUser(userId, { emailVerified: true });
    return NextResponse.redirect(`${url.origin}/dashboard?verified=1`);
  }
  // Expired or bogus link — the dashboard banner offers a fresh one.
  return NextResponse.redirect(`${url.origin}/dashboard?verified=0`);
}
