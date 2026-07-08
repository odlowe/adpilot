"use client";

import { Eye, HandCoins, Info, MousePointerClick, Percent, PhoneCall, UserPlus } from "lucide-react";
import PerformanceChart from "./PerformanceChart";
import type { Metrics } from "@/lib/metrics";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/**
 * Standard Meta/Google-grade metrics, each with a plain-English hover tooltip.
 */
export default function AnalyticsPanel({ metrics }: { metrics: Metrics }) {
  const cards = [
    {
      icon: Eye,
      label: "Total Impressions",
      value: metrics.impressions.toLocaleString(),
      tooltip: "Total views — how many times your ad appeared on someone's screen.",
    },
    {
      icon: MousePointerClick,
      label: "Clicks",
      value: metrics.clicks.toLocaleString(),
      tooltip: "Website visitors — people who tapped your ad to learn more.",
    },
    {
      icon: Percent,
      label: "CTR (Click-Through Rate)",
      value: `${metrics.ctr.toFixed(2)}%`,
      tooltip: "Interest percentage — of everyone who saw the ad, how many clicked. 2%+ is healthy for local ads.",
    },
    {
      icon: HandCoins,
      label: "Avg. CPC",
      value: money(metrics.avgCpc),
      tooltip: "Cost per visitor click — what you paid, on average, for each person who clicked.",
    },
    {
      icon: PhoneCall,
      label: "Total Conversions",
      value: metrics.conversions.toLocaleString(),
      tooltip: "Leads or phone calls generated — people who took action, like calling or filling out your form.",
    },
    {
      icon: UserPlus,
      label: "Cost per Acquisition",
      value: money(metrics.costPerAcquisition),
      tooltip: "Cost per new customer — total spend divided by conversions. Your ROI at a glance.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, tooltip }) => (
          <div
            key={label}
            className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Icon size={17} />
              </span>
              <Info size={14} className="text-slate-300 transition group-hover:text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-navy-900">
              {value}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>

            {/* plain-English tooltip */}
            <span className="pointer-events-none absolute left-1/2 top-2 z-20 w-60 -translate-x-1/2 -translate-y-full rounded-xl bg-navy-900 px-3.5 py-2.5 text-xs leading-relaxed text-slate-100 opacity-0 shadow-lift transition group-hover:opacity-100">
              {tooltip}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Traffic &amp; clicks — last 30 days
        </h3>
        <div className="mt-4">
          <PerformanceChart series={metrics.series} />
        </div>
      </div>
    </div>
  );
}
