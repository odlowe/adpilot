import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitor";
import { rateLimit } from "@/lib/ratelimit";

/** Receives browser-side crashes from the global error boundary. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "monitor", 10, 60_000);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as
    | { message?: string; url?: string }
    | null;
  const message = body?.message?.slice(0, 500) ?? "Unknown client error";
  await reportError("client", new Error(message), { url: body?.url?.slice(0, 300) });
  return NextResponse.json({ ok: true });
}
