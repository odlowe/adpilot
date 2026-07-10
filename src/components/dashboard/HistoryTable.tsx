"use client";

import { Archive, BarChart3, Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readError, startCheckout } from "@/lib/client";
import { metricsForCampaign, outcomeSummary, windowDaysFor } from "@/lib/metrics";
import type { Campaign } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function HistoryTable({
  campaigns,
  onViewAnalytics,
  onManageCreatives,
}: {
  campaigns: Campaign[];
  onViewAnalytics: (campaign: Campaign) => void;
  onManageCreatives: (campaign: Campaign) => void;
}) {
  const router = useRouter();
  const completed = campaigns.filter((c) => c.status === "completed");

  // rerun state
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [rerunError, setRerunError] = useState<string | null>(null);

  /** Clone a past campaign as a fresh run, then hand off to Stripe. */
  async function rerun(campaign: Campaign) {
    setRerunningId(campaign.id);
    setRerunError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/rerun`, { method: "POST" });
      if (!res.ok) {
        setRerunError(await readError(res));
        return;
      }
      const data = (await res.json()) as { campaign?: Campaign };
      const fresh = data.campaign;

      // Billing on → Stripe payment page; off → straight to the dashboard.
      try {
        const payUrl = await startCheckout(fresh?.name ?? campaign.name, fresh?.budget ?? campaign.budget);
        if (payUrl) {
          window.location.href = payUrl;
          return;
        }
      } catch {
        // Checkout hiccup shouldn't undo the rerun itself.
      }
      router.refresh();
    } catch {
      setRerunError("No connection — check your internet and try again.");
    } finally {
      setRerunningId(null);
    }
  }

  // inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (completed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Archive size={26} className="mx-auto text-slate-300" />
        <p className="mt-3 font-semibold text-slate-600">No completed campaigns yet</p>
        <p className="mt-1 text-sm text-slate-400">
          When a campaign finishes its run, its full results are archived here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    {error && (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
        {error}
      </p>
    )}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        {rerunError && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {rerunError}
          </p>
        )}
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5">Campaign Name / Target</th>
              <th className="px-5 py-3.5">Date Range</th>
              <th className="px-5 py-3.5">Total Capital Spent</th>
              <th className="px-5 py-3.5">Final Outcome Summary</th>
              <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {completed.map((campaign) => {
              const metrics = metricsForCampaign(campaign, windowDaysFor([campaign], "all"));
              const renaming = renamingId === campaign.id;
              return (
                <tr key={campaign.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    {renaming ? (
                      <span className="flex items-center gap-1.5">
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
                          className="w-full max-w-[220px] rounded-lg border border-emerald-400 px-2.5 py-1.5 text-sm font-semibold text-navy-900 outline-none ring-4 ring-emerald-100"
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
                      <p className="flex items-center gap-1.5 font-semibold text-navy-900">
                        {campaign.creativeUrl && (
                          <button
                            type="button"
                            onClick={() => onManageCreatives(campaign)}
                            title="View this campaign's images"
                            className="shrink-0 rounded-md transition hover:ring-2 hover:ring-emerald-400"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={campaign.creativeUrl}
                              alt=""
                              className="h-9 w-9 rounded-md border border-slate-200 object-cover"
                            />
                          </button>
                        )}
                        {campaign.name}
                        <button
                          type="button"
                          onClick={() => startRename(campaign)}
                          aria-label={`Rename ${campaign.name}`}
                          className="rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-navy-900"
                        >
                          <Pencil size={13} />
                        </button>
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {campaign.targetingJson.radiusMiles} mile radius
                      {campaign.isSample && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">
                          Sample
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {fmtDate(campaign.startDate)} — {campaign.endDate ? fmtDate(campaign.endDate) : "ongoing"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold tabular-nums text-navy-900">
                    {money(campaign.budget * campaign.durationMonths)}
                  </td>
                  <td className="px-5 py-4 font-medium text-emerald-700">{outcomeSummary(metrics)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={rerunningId !== null}
                        onClick={() => void rerun(campaign)}
                        title="Run this exact campaign again — same ads, images, and targeting"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {rerunningId === campaign.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        Rerun campaign
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewAnalytics(campaign)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700"
                      >
                        <BarChart3 size={14} />
                        View analytics
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
