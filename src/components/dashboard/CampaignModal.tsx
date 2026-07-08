"use client";

import { CheckCircle2, Gauge, Loader2, MapPin, Rocket, Timer, Wand2, X } from "lucide-react";
import { useState } from "react";
import CampaignPreview from "./CampaignPreview";
import CreativeUploader from "./CreativeUploader";
import Slider from "@/components/ui/Slider";
import type { CampaignDraft, CampaignPlan } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Phase = "editing" | "generating" | "preview" | "launching" | "launched";

interface CampaignModalProps {
  businessId: string;
  businessName: string;
  initialDraft?: CampaignDraft | null;
  onClose: () => void;
  onLaunched: () => void;
}

/** The 3-slider configurator in a modal: configure → preview → Launch Everywhere. */
export default function CampaignModal({
  businessId,
  businessName,
  initialDraft,
  onClose,
  onLaunched,
}: CampaignModalProps) {
  const [intentText, setIntentText] = useState(initialDraft?.intentText ?? "");
  const [budget, setBudget] = useState(initialDraft?.budget ?? 1000);
  const [radius, setRadius] = useState(initialDraft?.radiusMiles ?? 15);
  const [zip, setZip] = useState(initialDraft?.zip ?? "");
  const [duration, setDuration] = useState(initialDraft?.durationMonths ?? 1);
  const [continuous, setContinuous] = useState(initialDraft?.continuous ?? false);
  const [phase, setPhase] = useState<Phase>("editing");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fee = Math.round(budget * 0.15);
  const busy = phase === "generating" || phase === "launching";

  async function handleGenerate() {
    setError(null);
    setPhase("generating");
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
        body: JSON.stringify({
          businessId,
          budget,
          zip,
          durationMonths: duration,
          continuous,
          industryText: intentText,
          plan,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Launch failed. Please try again.");
        setPhase("preview");
        return;
      }
      setPhase("launched");
      onLaunched();
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setPhase("preview");
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-slate-50 shadow-lift">
        {/* header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">New campaign</h2>
            <p className="text-sm text-slate-500">for {businessName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {phase === "launched" ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={34} className="text-emerald-600" />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-navy-900">
                Your campaign is on its way!
              </h3>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                Submitted to Google, Instagram, and Reddit for a quick review — most campaigns go
                live within 24 hours. We&apos;ll take it from here.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-7 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800"
              >
                Back to my dashboard
              </button>
            </div>
          ) : (
            <>
              <label className="text-sm font-semibold text-navy-900" htmlFor="modal-intent">
                Describe Your Target Customer in Plain English
              </label>
              <textarea
                id="modal-intent"
                rows={3}
                value={intentText}
                onChange={(e) => setIntentText(e.target.value)}
                placeholder="e.g., I run a boutique dress shop in town and want to target moms who care about sustainable, eco-friendly clothing..."
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />

              <div className="mt-6 space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Gauge size={15} className="text-emerald-600" /> The Fuel Dial — monthly budget
                  </p>
                  <div className="mt-3">
                    <Slider label="" min={250} max={5000} step={50} value={budget} onChange={setBudget} format={money} leftHint="$250" rightHint="$5,000" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {money(budget)} to networks + {money(fee)} fee (15%) ={" "}
                    <span className="font-bold text-navy-900">{money(budget + fee)} total billing</span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <MapPin size={15} className="text-emerald-600" /> The Distance Dial — local radius
                  </p>
                  <div className="mt-3">
                    <Slider label="" min={1} max={50} value={radius} onChange={setRadius} format={(v) => `${v} mile${v === 1 ? "" : "s"}`} leftHint="1 mile" rightHint="50 miles" />
                  </div>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP code or business address"
                    className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Timer size={15} className="text-emerald-600" /> The Speed Dial — duration
                  </p>
                  <div className={`mt-3 transition ${continuous ? "pointer-events-none opacity-40" : ""}`}>
                    <Slider label="" min={1} max={6} value={duration} onChange={setDuration} format={(v) => `${v} month${v === 1 ? "" : "s"}`} leftHint="1 month" rightHint="6 months" />
                  </div>
                  <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={continuous}
                      onChange={(e) => setContinuous(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Continuous / Ongoing — run month to month, pause anytime
                  </label>
                </div>

                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Ad photo or video <span className="font-normal text-slate-400">(optional)</span>
                  </p>
                  <div className="mt-2">
                    <CreativeUploader />
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                  {error}
                </p>
              )}

              {phase === "generating" && (
                <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-7 text-center">
                  <Loader2 size={24} className="mx-auto animate-spin text-emerald-600" />
                  <p className="mt-3 font-semibold text-navy-900">Writing your ads and mapping your audience…</p>
                  <p className="mt-1 text-sm text-slate-500">Usually done in a few seconds.</p>
                </div>
              )}

              {plan && (phase === "preview" || phase === "launching") && (
                <div className="mt-6">
                  <CampaignPreview plan={plan} />
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy || intentText.trim().length < 12}
                  className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wand2 size={16} className="text-emerald-400" />
                  {plan ? "Regenerate Preview" : "Generate Campaign Preview"}
                </button>
                {plan && (
                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {phase === "launching" ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    Launch Everywhere
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
