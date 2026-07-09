"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Slider from "@/components/ui/Slider";
import type { Campaign } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Edit a live campaign: name, budget, ZIP, and duration. */
export default function EditCampaignModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [budget, setBudget] = useState(campaign.budget);
  const [zip, setZip] = useState(campaign.zip);
  const [duration, setDuration] = useState(campaign.durationMonths);
  const [continuous, setContinuous] = useState(campaign.continuous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = Math.round(budget * 0.15);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: { name, budget, zip, durationMonths: duration, continuous },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-lg rounded-2xl bg-white p-7 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Edit campaign</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Changes apply from today — money already spent stays spent.
        </p>

        <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="camp-name">
          Campaign name
        </label>
        <input
          id="camp-name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <div className="mt-5">
          <Slider
            label="Monthly budget"
            min={250}
            max={5000}
            step={50}
            value={budget}
            onChange={setBudget}
            format={money}
            leftHint="$250"
            rightHint="$5,000"
          />
          <p className="mt-2 text-sm text-slate-500">
            {money(budget)} + {money(fee)} fee ={" "}
            <span className="font-bold text-navy-900">{money(budget + fee)}/month</span>
          </p>
        </div>

        <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="camp-zip">
          ZIP code or address
        </label>
        <input
          id="camp-zip"
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="The center of your targeting circle"
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <div className={`mt-5 transition ${continuous ? "pointer-events-none opacity-40" : ""}`}>
          <Slider
            label="Duration"
            min={1}
            max={6}
            value={duration}
            onChange={setDuration}
            format={(v) => `${v} month${v === 1 ? "" : "s"}`}
            leftHint="1 month"
            rightHint="6 months"
          />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={continuous}
            onChange={(e) => setContinuous(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Continuous / Ongoing
        </label>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  );
}
