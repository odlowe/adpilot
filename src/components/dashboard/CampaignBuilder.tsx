"use client";

import { CheckCircle2, Loader2, Rocket, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CampaignPreview from "./CampaignPreview";
import CreativeUploader from "./CreativeUploader";
import Slider from "@/components/ui/Slider";
import type { CampaignPlan } from "@/lib/types";

const FEE_RATE = 0.15;

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Phase = "editing" | "generating" | "preview" | "launching" | "launched";

export default function CampaignBuilder() {
  const router = useRouter();
  const [budget, setBudget] = useState(750);
  const [radius, setRadius] = useState(10);
  const [intentText, setIntentText] = useState("");
  const [phase, setPhase] = useState<Phase>("editing");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fee = Math.round(budget * FEE_RATE);
  const total = budget + fee;
  const busy = phase === "generating" || phase === "launching";

  async function handleGenerate() {
    setError(null);
    setPhase("generating");
    setPlan(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentText, budget, radiusMiles: radius }),
      });
      const data = (await res.json()) as { plan?: CampaignPlan; error?: string };
      if (!res.ok || !data.plan) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPhase("editing");
        return;
      }
      setPlan(data.plan);
      setPhase("preview");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setPhase("editing");
    }
  }

  async function handleLaunch() {
    if (!plan) return;
    setError(null);
    setPhase("launching");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, industryText: intentText, plan }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Launch failed. Please try again.");
        setPhase("preview");
        return;
      }
      setPhase("launched");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setPhase("preview");
    }
  }

  function handleStartAnother() {
    setPlan(null);
    setIntentText("");
    setPhase("editing");
  }

  if (phase === "launched") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={34} className="text-emerald-600" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-navy-900">
          Your campaign is on its way!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          It&apos;s been submitted to Google, Instagram, and Reddit for a quick
          review — most campaigns go live within 24 hours. We&apos;ll take it
          from here.
        </p>
        <button
          type="button"
          onClick={handleStartAnother}
          className="mt-7 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800"
        >
          Create another campaign
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-navy-900">New campaign</h2>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-2">
          <Slider
            label="Monthly budget"
            min={100}
            max={5000}
            step={50}
            value={budget}
            onChange={setBudget}
            format={money}
            leftHint="$100"
            rightHint="$5,000"
          />
          <Slider
            label="Local reach"
            min={1}
            max={50}
            value={radius}
            onChange={setRadius}
            format={(v) => `${v} mile${v === 1 ? "" : "s"}`}
            leftHint="1 mile"
            rightHint="50 miles"
          />
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
          {money(budget)} ad spend + {money(fee)} software fee (15%) ={" "}
          <span className="font-bold text-navy-900">{money(total)} total per month</span>
        </p>

        <div className="mt-7">
          <label htmlFor="intent" className="text-sm font-semibold text-navy-900">
            Who are your customers? Say it in your own words.
          </label>
          <textarea
            id="intent"
            rows={4}
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            placeholder="e.g., I run a boutique dress shop in town and want to target moms who care about sustainable, eco-friendly clothing..."
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-navy-900">
            Add a photo or video <span className="font-normal text-slate-400">(optional — we can generate one)</span>
          </p>
          <div className="mt-2">
            <CreativeUploader />
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || intentText.trim().length < 12}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3.5 text-base font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {phase === "generating" ? (
            <>
              <Loader2 size={18} className="animate-spin text-emerald-400" />
              Your agent is thinking&hellip;
            </>
          ) : (
            <>
              <Wand2 size={18} className="text-emerald-400" />
              Generate Campaign Preview
            </>
          )}
        </button>
      </div>

      {phase === "generating" && (
        <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
          <Loader2 size={26} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-3 font-semibold text-navy-900">
            Writing your ads and mapping your audience&hellip;
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Headlines, keywords, and interest groups — usually done in a few seconds.
          </p>
        </div>
      )}

      {plan && (phase === "preview" || phase === "launching") && (
        <>
          <CampaignPreview plan={plan} />
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:flex-row sm:justify-between">
            <p className="text-sm text-slate-600">
              Happy with it? One click puts this live on all three platforms —{" "}
              <span className="font-bold text-navy-900">{money(total)}/month</span>, pause anytime.
            </p>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={busy}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "launching" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Rocket size={18} />
              )}
              Launch Everywhere
            </button>
          </div>
        </>
      )}
    </div>
  );
}
