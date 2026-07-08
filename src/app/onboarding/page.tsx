"use client";

import { ArrowLeft, ArrowRight, Loader2, PartyPopper, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const CATEGORIES = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
] as const;

/** 2-step wizard: business name → category. Creates the user's first business. */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Retail/Boutique");
  const [submitting, setSubmitting] = useState(false);

  async function finish() {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, category }),
      });
    } finally {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-12">
      <Logo />
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <PartyPopper size={13} />
            Account created — you&apos;re in!
          </span>
          <span className="text-xs font-semibold text-slate-400">Step {step} of 2</span>
        </div>

        {/* progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-900">
              What is your Business Name?
            </h1>
            <p className="mt-1.5 text-slate-500">
              This is how your ads will introduce you to the neighborhood.
            </p>
            <div className="relative mt-6">
              <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                minLength={2}
                autoFocus
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder='e.g., "Main St. Bakery"'
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-navy-800"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finish();
            }}
          >
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-900">
              Select Your Business Category
            </h1>
            <p className="mt-1.5 text-slate-500">
              So your smart helper starts with the right playbook for {businessName || "your business"}.
            </p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                Open my dashboard
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
