"use client";

import { ArrowRight, Loader2, PartyPopper, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const INDUSTRIES = [
  "Bakery / Café",
  "Restaurant / Food",
  "Retail / Boutique",
  "Salon / Spa / Beauty",
  "Fitness / Wellness",
  "Home Services",
  "Health / Practice",
  "Pets",
  "Something else",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry }),
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <PartyPopper size={13} />
          Account created — you&apos;re in!
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy-900">
          Tell us about your business
        </h1>
        <p className="mt-1.5 text-slate-500">
          Two quick questions so your smart helper knows who it&apos;s working for.
          You can change these anytime.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-6">
          <div>
            <label htmlFor="businessName" className="text-sm font-semibold text-navy-900">
              What&apos;s your business called?
            </label>
            <div className="relative mt-1.5">
              <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Main St. Bakery"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-navy-900">What kind of business is it?</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {INDUSTRIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIndustry(option)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    industry === option
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-card"
                      : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-navy-900"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Take me to my dashboard
            <ArrowRight size={18} />
          </button>
          <p className="text-center text-xs text-slate-400">
            In a hurry? You can skip — just hit the button.
          </p>
        </form>
      </div>
    </main>
  );
}
