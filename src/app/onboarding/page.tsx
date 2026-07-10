"use client";

import { ArrowLeft, ArrowRight, Loader2, PartyPopper, Sparkles, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/Logo";

const CATEGORIES = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
] as const;

/**
 * 3-step wizard: business name → category → business profile (skippable).
 * The profile step feeds the AI — better description = better ads — but
 * never blocks anyone from reaching the dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Retail/Boutique");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function finish(includeProfile: boolean) {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          category,
          ...(includeProfile ? { description, address, phone, website } : {}),
        }),
      });
    } finally {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
  const labelClass = "mt-4 block text-sm font-semibold text-navy-900";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <PartyPopper size={13} />
            Account created — you&apos;re in!
          </span>
          <span className="text-xs font-semibold text-slate-400">Step {step} of 3</span>
        </div>

        {/* progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
          />
        </div>

        {step === 1 && (
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
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(3);
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-navy-800"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finish(true);
            }}
          >
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-900">
              Tell your agent about {businessName || "your business"}
            </h1>
            <p className="mt-1.5 flex items-start gap-1.5 text-slate-500">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                Everything here feeds the AI that writes your ads and designs your visuals —
                the more it knows, the better they get. You can add or change this anytime in Settings.
              </span>
            </p>

            <label className={labelClass} htmlFor="ob-desc">
              What makes this business special?
            </label>
            <textarea
              id="ob-desc"
              rows={3}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Family-owned since 2009. Known for sourdough and cinnamon rolls. Regulars love the cozy back patio..."
              className={`${inputClass} mt-1.5 resize-y`}
            />

            <label className={labelClass} htmlFor="ob-address">Address</label>
            <input
              id="ob-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="142 Main Street, Springfield"
              className={`${inputClass} mt-1.5`}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-navy-900" htmlFor="ob-phone">Phone</label>
                <input
                  id="ob-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy-900" htmlFor="ob-web">Website</label>
                <input
                  id="ob-web"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="mainstbakery.com"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900 disabled:opacity-60"
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
            <button
              type="button"
              onClick={() => void finish(false)}
              disabled={submitting}
              className="mt-3 w-full text-center text-sm font-semibold text-slate-400 transition hover:text-navy-700 disabled:opacity-60"
            >
              Skip for now — I&apos;ll fill this in later
            </button>
          </form>
        )}
      </div>
    </main>
    <Footer />
    </div>
  );
}
