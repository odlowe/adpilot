import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `You're on the waitlist — ${BRAND.name}` };

/** Where non-allowlisted accounts land while the doors are still closed. */
export default function WaitlistPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Logo />
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <PartyPopper size={13} />
            Spot saved
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-navy-900">
            You&apos;re on the waitlist!
          </h1>
          <p className="mt-3 text-slate-600">
            {BRAND.name} is opening its doors to local businesses a few at a time, so every
            single one gets a great experience. Your account is created and your place in
            line is saved.
          </p>
          <p className="mt-3 text-slate-600">
            The moment it&apos;s your turn, we&apos;ll email you — and you can log straight in
            with the details you just used.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800"
          >
            Back to the homepage
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
