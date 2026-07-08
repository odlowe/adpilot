import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "./db";
import type { SafeUser, User } from "./types";

const SESSION_COOKIE = "adpilot_session";
const SECRET = process.env.SESSION_SECRET ?? "adpilot-dev-secret-change-me";

// ---- passwords ------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---- sessions (signed cookie) ----------------------------------------------

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSession(userId: string): void {
  cookies().set(SESSION_COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [userId, signature] = raw.split(".");
  if (!userId || !signature || sign(userId) !== signature) return null;
  const user = await getUserById(userId);
  return user ? toSafeUser(user) : null;
}

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}
