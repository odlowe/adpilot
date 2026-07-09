"use client";

import { CheckSquare, Filter, Square } from "lucide-react";
import { useMemo, useState } from "react";
import AnalyticsPanel from "./AnalyticsPanel";
import { aggregateMetrics, metricsForCampaign } from "@/lib/metrics";
import type { Campaign } from "@/lib/types";

/**
 * The business-wide analytics tab: covers every campaign ever run, with a
 * picker to include or exclude individual ad buys from the combined numbers.
 */
export default function AnalyticsView({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(campaigns.map((c) => c.id))
  );

  const selected = campaigns.filter((c) => selectedIds.has(c.id));
  const metrics = useMemo(
    () => aggregateMetrics(selected.map(metricsForCampaign)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, campaigns]
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = selectedIds.size === campaigns.length;

  return (
    <div className="space-y-6">
      {/* scope banner + picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
              <Filter size={14} className="text-emerald-600" />
              Choose which ad buys to include
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {allSelected
                ? "Showing combined results for every campaign this business has ever run."
                : `Showing ${selected.length} of ${campaigns.length} campaigns combined.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedIds(allSelected ? new Set() : new Set(campaigns.map((c) => c.id)))
            }
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {campaigns.map((campaign) => {
            const checked = selectedIds.has(campaign.id);
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => toggle(campaign.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  checked
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-200 bg-white opacity-60 hover:opacity-100"
                }`}
              >
                {checked ? (
                  <CheckSquare size={17} className="shrink-0 text-emerald-600" />
                ) : (
                  <Square size={17} className="shrink-0 text-slate-300" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-900">
                    {campaign.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {campaign.status === "active"
                      ? "Live now"
                      : campaign.status === "paused"
                        ? "Paused"
                        : "Completed"}
                    {campaign.isSample ? " · Sample" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-600">No campaigns selected</p>
          <p className="mt-1 text-sm text-slate-400">
            Tick at least one campaign above to see its numbers.
          </p>
        </div>
      ) : (
        <AnalyticsPanel metrics={metrics} />
      )}
    </div>
  );
}
