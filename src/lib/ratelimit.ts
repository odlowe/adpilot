import { NextResponse } from "next/server";

/**
 * Tiny in-memory sliding-window rate limiter.
 *
 * Honest scope: memory is per serverless instance, so a determined attacker
 * hitting many cold instances can exceed these numbers. This exists to stop
 * the common cases — bots hammering signup, scripts burning the AI budget —
 * cheaply and with zero dependencies. Swap for Upstash/Redis if it ever
 * needs to be airtight.
 */

const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Returns a ready-made 429 response when over the limit, or null to proceed.
 *   const blocked = rateLimit(request, "signup", 5, 10 * 60_000);
 *   if (blocked) return blocked;
 */
export function rateLimit(
  request: Request,
  name: string,
  max: number,
  windowMs: number,
  extraKey?: string
): NextResponse | null {
  const key = `${name}:${extraKey ?? clientIp(request)}`;
  const now = Date.now();

  // Cheap global cleanup so the map can't grow forever.
  if (hits.size > MAX_KEYS) hits.clear();

  const stamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= max) {
    const retryAfterSec = Math.ceil((windowMs - (now - stamps[0])) / 1000);
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSec)) } }
    );
  }
  stamps.push(now);
  hits.set(key, stamps);
  return null;
}
