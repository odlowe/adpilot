"use client";

import {
  BarChart3,
  Check,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Rocket,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { budgetProgress } from "@/lib/metrics";
import { readError } from "@/lib/client";
import type { Campaign, CampaignStatus, Platform, PlatformStatus } from "@/lib/types";

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
  onEdit,
  onManageCreatives,
}: {
  campaigns: Campaign[];
  onCreate: () => void;
  onViewAnalytics: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onManageCreatives: (campaign: Campaign) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // inline rename state — the pencil only changes the name, nothing else
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  // Optimistic status flips: Pause/Play swaps instantly, the server syncs in
  // the background, and a failed request rolls the button back.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CampaignStatus>>({});

  // Fresh server data arrived (router.refresh() landed) — local overrides done.
  useEffect(() => setStatusOverrides({}), [campaigns]);

  const withOverrides = campaigns.map((c) =>
    statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c
  );
  const active = withOverrides.filter((c) => c.status === "active" || c.status === "paused");

  async function control(campaign: Campaign, action: "pause" | "resume" | "end") {
    if (action === "end" && !window.confirm(`End "${campaign.name}" for good? It moves to Past Ad Buys and can't be restarted.`)) {
      return;
    }
    // Flip the UI first — the click should feel instant.
    const previous = campaign.status;
    const optimistic: CampaignStatus =
      action === "pause" ? "paused" : action === "resume" ? "active" : "completed";
    setStatusOverrides((prev) => ({ ...prev, [campaign.id]: optimistic }));
    setBusyId(campaign.id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        // Server said no — put the button back the way it was.
        setStatusOverrides((prev) => ({ ...prev, [campaign.id]: previous }));
        setError(await readError(res));
        return;
      }
      router.refresh();
    } catch {
      setStatusOverrides((prev) => ({ ...prev, [campaign.id]: previous }));
      setError("No connection — check your internet and try again.");
    } finally {
      setBusyId(null);
    }
  }

  function startRename(campaign: Campaign) {
    setRenamingId(campaign.id);
    setRenameValue(campaign.name);
  }

  async function saveRename(campaign: Campaign) {
    const name = renameValue.trim();
    if (name.length < 2 || name === campaign.name) {
      setRenamingId(null);
      return;
    }
    setSavingRename(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { name } }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      router.refresh();
      setRenamingId(null);
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setSavingRename(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}
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
            const renaming = renamingId === campaign.id;
            return (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {campaign.creativeUrl && (
                      <button
                        type="button"
                        onClick={() => onManageCreatives(campaign)}
                        title="View & manage this campaign's images"
                        className="group relative shrink-0 rounded-lg transition hover:ring-2 hover:ring-emerald-400"
                      >
                      {campaign.creativeUrl.startsWith("data:video") ||
                      /\.(mp4|webm|mov)($|\?)/i.test(campaign.creativeUrl) ? (
                        <video
                          src={campaign.creativeUrl}
                          muted
                          loop
                          autoPlay
                          playsInline
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={campaign.creativeUrl}
                          alt="Campaign images"
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                      )}
                      </button>
                    )}
                  <div className="min-w-0">
                    {renaming ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveRename(campaign);
                            }
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="w-full max-w-[260px] rounded-lg border border-emerald-400 px-2.5 py-1.5 text-sm font-bold text-navy-900 outline-none ring-4 ring-emerald-100"
                          aria-label="New campaign name"
                        />
                        <button
                          type="button"
                          disabled={savingRename}
                          onClick={() => void saveRename(campaign)}
                          aria-label="Save name"
                          className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                        >
                          {savingRename ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          aria-label="Cancel rename"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ) : (
                      <p className="flex flex-wrap items-center gap-2 font-bold leading-snug text-navy-900">
                        {campaign.name}
                        <button
                          type="button"
                          onClick={() => startRename(campaign)}
                          aria-label={`Rename ${campaign.name}`}
                          title="Rename"
                          className="rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-navy-900"
                        >
                          <Pencil size={13} />
                        </button>
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
                    )}
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
                        <Play size={14} />
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === campaign.id}
                        onClick={() => control(campaign, "pause")}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-60"
                      >
                        <Pause size={14} />
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => onEdit(campaign)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-navy-400 hover:text-navy-900 disabled:opacity-60"
                    >
                      <SlidersHorizontal size={13} />
                      Edit campaign
                    </button>
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
