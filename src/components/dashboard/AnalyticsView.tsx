"use client";

import { CheckSquare, Filter, Search, Square, X } from "lucide-react";
import { useMemo, useState } from "react";
import AnalyticsPanel from "./AnalyticsPanel";
import TimeframePicker from "./TimeframePicker";
import { aggregateMetrics, metricsForCampaign, windowDaysFor, type Timeframe } from "@/lib/metrics";
import type { Campaign, CampaignStatus } from "@/lib/types";

type StatusFilter = "all" | CampaignStatus;

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Live" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
];

/**
 * The business-wide analytics tab: covers every campaign ever run, with a
 * search bar, status filter, and a picker to include or exclude individual
 * ad buys from the combined numbers.
 */
export default function AnalyticsView({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(campaigns.map((c) => c.id))
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  // Campaigns matching the search + filter — the only ones shown and counted.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (needle && !c.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [campaigns, query, statusFilter]);

  const selected = visible.filter((c) => selectedIds.has(c.id));
  const metrics = useMemo(
    () => {
      const windowDays = windowDaysFor(selected, timeframe);
      return aggregateMetrics(selected.map((c) => metricsForCampaign(c, windowDays)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, visible, timeframe]
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = visible.length > 0 && visible.every((c) => selectedIds.has(c.id));
  const filtering = query.trim() !== "" || statusFilter !== "all";

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
              {allSelected && !filtering
                ? "Showing combined results for every campaign this business has ever run."
                : `Showing ${selected.length} of ${visible.length} matching campaign${visible.length === 1 ? "" : "s"} combined.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedIds((current) => {
                const next = new Set(current);
                if (allSelected) visible.forEach((c) => next.delete(c.id));
                else visible.forEach((c) => next.add(c.id));
                return next;
              })
            }
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        {/* search + status filter */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns by name…"
              aria-label="Search campaigns"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === key
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-navy-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            No campaigns match your search — try a different name or filter.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {visible.map((campaign) => {
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
        )}
      </div>

      {selected.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-600">No campaigns selected</p>
          <p className="mt-1 text-sm text-slate-400">
            Tick at least one campaign above to see its numbers.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <TimeframePicker value={timeframe} onChange={setTimeframe} />
          </div>
          <AnalyticsPanel metrics={metrics} />
        </>
      )}
    </div>
  );
}
