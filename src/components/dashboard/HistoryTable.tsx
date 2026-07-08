"use client";

import { Archive } from "lucide-react";
import { metricsForCampaign, outcomeSummary } from "@/lib/metrics";
import type { Campaign } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function HistoryTable({ campaigns }: { campaigns: Campaign[] }) {
  const completed = campaigns.filter((c) => c.status === "completed");

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5">Campaign Name / Target</th>
              <th className="px-5 py-3.5">Date Range</th>
              <th className="px-5 py-3.5">Total Capital Spent</th>
              <th className="px-5 py-3.5">Final Outcome Summary</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((campaign) => {
              const metrics = metricsForCampaign(campaign);
              return (
                <tr key={campaign.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-navy-900">{campaign.name}</p>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
