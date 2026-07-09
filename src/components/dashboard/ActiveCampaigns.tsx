"use client";

import {
  BarChart3,
  Loader2,
  MapPin,
  Pause,
  Play,
  Plus,
  Radio,
  Rocket,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { budgetProgress } from "@/lib/metrics";
import type { Campaign, Platform, PlatformStatus } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PLATFORMS: Array<{ key: Platform; label: string }> = [
  { key: "meta", label: "Meta Ads" },
  { key: "google", label: "Google Ads" },
  { key: "reddit", label: "Reddit Ads" },
];

const STATUS_DOT: Record<PlatformStatus, string> = {
  live: "bg-emerald-500",
  in_review: "bg-amber-400",
  draft: "bg-slate-300",
  paused: "bg-slate-300",
};

const STATUS_TEXT: Record<PlatformStatus, string> = {
  live: "Live",
  in_review: "In review",
  draft: "Draft",
  paused: "Paused",
};

export default function ActiveCampaigns({
  campaigns,
  onCreate,
  onViewAnalytics,
}: {
  campaigns: Campaign[];
  onCreate: () => void;
  onViewAnalytics: (campaign: Campaign) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = campaigns.filter((c) => c.status === "active" || c.status === "paused");

  async function control(campaign: Campaign, action: "pause" | "resume" | "end") {
    if (action === "end" && !window.confirm(`End "${campaign.name}" for good? It moves to Past Ad Buys and can't be restarted.`)) {
      return;
    }
    setBusyId(campaign.id);
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Rocket size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-600">No campaigns running for this business</p>
          <p className="mt-1 text-sm text-slate-400">Three dials and one sentence — takes about a minute.</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500"
          >
            <Plus size={16} />
            Create New Campaign
          </button>
        </div>
      ) : (
        <>
          {active.map((campaign) => {
            const progress = budgetProgress(campaign);
            const delivered = Math.round(campaign.budget * progress);
            return (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold leading-snug text-navy-900">
                      {campaign.name}
                      {campaign.isSample && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          Sample
                        </span>
                      )}
                      {campaign.status === "paused" && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          Paused
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="font-semibold text-emerald-700">{money(campaign.budget)}/month</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {campaign.targetingJson.radiusMiles} miles{campaign.zip ? ` around ${campaign.zip}` : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Radio size={13} />
                        {campaign.continuous ? "Continuous" : `${campaign.durationMonths} month run`}
                      </span>
                      {campaign.manualMode && (
                        <span className="flex items-center gap-1 font-semibold text-navy-700">
                          <SlidersHorizontal size={13} />
                          Manual mode
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {PLATFORMS.map(({ key, label }) => (
                      <span key={key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <span className={`relative flex h-2.5 w-2.5 rounded-full ${STATUS_DOT[campaign.platformStatuses[key]]}`}>
                          {campaign.platformStatuses[key] === "live" && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                          )}
                        </span>
                        {label}
                        <span className="font-normal text-slate-400">· {STATUS_TEXT[campaign.platformStatuses[key]]}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* budget delivery */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Budget delivery this cycle</span>
                    <span className="tabular-nums text-navy-900">
                      {money(delivered)} of {money(campaign.budget)} ({Math.round(progress * 100)}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {campaign.status === "paused" ? (
                      <button
                        type="button"
                        disabled={busyId === campaign.id}
                        onClick={() => control(campaign, "resume")}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {busyId === campaign.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === campaign.id}
                        onClick={() => control(campaign, "pause")}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-60"
                      >
                        {busyId === campaign.id ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => control(campaign, "end")}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-700 disabled:opacity-60"
                    >
                      <Square size={13} />
                      End campaign
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewAnalytics(campaign)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <BarChart3 size={14} />
                    View analytics
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700"
          >
            <Plus size={17} />
            Create New Campaign
          </button>
        </>
      )}
    </div>
  );
}
