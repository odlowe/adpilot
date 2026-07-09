import { NextResponse } from "next/server";
import { clearSession, getCurrentUser, toSafeUser } from "@/lib/auth";
import { deleteUser, findUserByEmail, updateUser } from "@/lib/db";
import type { BillingInfo, DigestFrequency, EmailPrefs } from "@/lib/types";

const FREQUENCIES: DigestFrequency[] = ["daily", "weekly", "monthly"];

/**
 * Updates account info and (demo) billing details.
 * Card numbers are never stored — only the last 4 digits for display.
 * Real payment processing arrives with Stripe.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        fullName?: string;
        email?: string;
        birthdate?: string | null;
        billing?: {
          nameOnCard?: string;
          cardNumber?: string;
          expMonth?: number;
          expYear?: number;
          billingZip?: string;
        } | null;
        emailPrefs?: { enabled?: boolean; digestFrequency?: string };
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const patch: {
    fullName?: string;
    email?: string;
    birthdate?: string | null;
    billingJson?: BillingInfo | null;
    emailPrefs?: EmailPrefs;
  } = {};

  if (body.emailPrefs) {
    patch.emailPrefs = {
      enabled: body.emailPrefs.enabled !== false,
      digestFrequency: FREQUENCIES.includes(body.emailPrefs.digestFrequency as DigestFrequency)
        ? (body.emailPrefs.digestFrequency as DigestFrequency)
        : "weekly",
    };
  }

  if (typeof body.fullName === "string") {
    if (body.fullName.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    patch.fullName = body.fullName.trim();
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "That email is already in use on another account." },
        { status: 409 }
      );
    }
    patch.email = email;
  }

  if (body.birthdate !== undefined) {
    patch.birthdate = body.birthdate || null;
  }

  if (body.billing !== undefined) {
    if (body.billing === null) {
      patch.billingJson = null;
    } else {
      const digits = (body.billing.cardNumber ?? "").replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) {
        return NextResponse.json(
          { error: "That card number doesn't look right." },
          { status: 400 }
        );
      }
      patch.billingJson = {
        nameOnCard: body.billing.nameOnCard?.trim() ?? "",
        cardLast4: digits.slice(-4),
        expMonth: Math.min(12, Math.max(1, Number(body.billing.expMonth) || 1)),
        expYear: Math.max(2026, Number(body.billing.expYear) || 2026),
        billingZip: body.billing.billingZip?.trim() ?? "",
      };
    }
  }

  const updated = await updateUser(user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ user: toSafeUser(updated) });
}

/** Permanently deletes the account and everything it owns. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  await deleteUser(user.id);
  clearSession();
  return NextResponse.json({ ok: true });
}
