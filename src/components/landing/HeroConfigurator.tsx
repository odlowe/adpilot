"use client";

import { ArrowRight, Gauge, MapPin, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CreativeUploader from "@/components/dashboard/CreativeUploader";
import Slider from "@/components/ui/Slider";
import type { CampaignDraft } from "@/lib/types";

export const DRAFT_STORAGE_KEY = "adpilot_campaign_draft";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * The "Extreme Simplicity" box: three dials, one sentence, one button.
 * The draft is stashed in localStorage and picked up by the dashboard right
 * after account creation, so nothing the visitor set here is lost.
 */
export default function HeroConfigurator() {
  const router = useRouter();
  const [intentText, setIntentText] = useState("");
  const [budget, setBudget] = useState(1000);
  const [radius, setRadius] = useState(15);
  const [zip, setZip] = useState("");
  const [duration, setDuration] = useState(1);
  const [continuous, setContinuous] = useState(false);

  const fee = Math.round(budget * 0.15);

  function handleSubmit() {
    const draft: CampaignDraft = {
      intentText,
      budget,
      radiusMiles: radius,
      zip,
      durationMonths: duration,
      continuous,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private browsing — the signup flow still works without the draft.
    }
    router.push("/signup");
  }

  return (
    <div id="configure" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-lift sm:p-8">
      <h2 className="text-xl font-extrabold tracking-tight text-navy-900 sm:text-2xl">
        Describe Your Target Customer in Plain English
      </h2>
      <textarea
        rows={4}
        value={intentText}
        onChange={(e) => setIntentText(e.target.value)}
        placeholder="e.g., I run a boutique dress shop in town and want to target moms who care about sustainable, eco-friendly clothing..."
        className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />

      <div className="mt-8 space-y-8">
        {/* Fuel dial */}
        <div>
          <DialLabel icon={<Gauge size={15} />} title="The Fuel Dial" hint="Monthly budget" />
          <div className="mt-3">
            <Slider
              label=""
              min={250}
              max={5000}
              step={50}
              value={budget}
              onChange={setBudget}
              format={money}
              leftHint="$250"
              rightHint="$5,000"
            />
          </div>
          <dl className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
            <div className="flex justify-between text-slate-600">
              <dt>Ad Spend (100% to networks)</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{money(budget)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Platform Management Fee (15%)</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{money(fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-navy-900">
              <dt>Total Billing</dt>
              <dd className="tabular-nums text-emerald-700">{money(budget + fee)}</dd>
            </div>
          </dl>
        </div>

        {/* Distance dial */}
        <div>
          <DialLabel icon={<MapPin size={15} />} title="The Distance Dial" hint="Local target radius" />
          <div className="mt-3">
            <Slider
              label=""
              min={1}
              max={50}
              value={radius}
              onChange={setRadius}
              format={(v) => `${v} mile${v === 1 ? "" : "s"}`}
              leftHint="1 mile"
              rightHint="50 miles"
            />
          </div>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP code or business address (the center of your circle)"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        {/* Speed dial */}
        <div>
          <DialLabel icon={<Timer size={15} />} title="The Speed Dial" hint="How long should it run?" />
          <div className={`mt-3 transition ${continuous ? "pointer-events-none opacity-40" : ""}`}>
            <Slider
              label=""
              min={1}
              max={6}
              value={duration}
              onChange={setDuration}
              format={(v) => `${v} month${v === 1 ? "" : "s"}`}
              leftHint="1 month"
              rightHint="6 months"
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={continuous}
            onClick={() => setContinuous((v) => !v)}
            className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-300"
          >
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                continuous ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  continuous ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">Continuous / Ongoing</span>
              <span className="block text-xs text-slate-500">
                Keep running month to month — pause anytime
              </span>
            </span>
          </button>
        </div>

        {/* Creative */}
        <div>
          <p className="text-sm font-semibold text-navy-900">
            Add a photo or video{" "}
            <span className="font-normal text-slate-400">(optional — we can generate one)</span>
          </p>
          <div className="mt-2">
            <CreativeUploader />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-emerald-500"
      >
        Create Account &amp; Preview Campaign
        <ArrowRight size={18} />
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        Free to set up. Nothing runs or bills until you approve the preview.
      </p>
    </div>
  );
}

function DialLabel({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <p className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-emerald-400">
        {icon}
      </span>
      <span className="text-sm font-bold text-navy-900">{title}</span>
      <span className="text-sm text-slate-400">— {hint}</span>
    </p>
  );
}
