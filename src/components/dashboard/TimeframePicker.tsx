"use client";

import { TIMEFRAMES, type Timeframe } from "@/lib/metrics";

/** The Last week / Last month / Last year / All time pill row. */
export default function TimeframePicker({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIMEFRAMES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            value === t.key
              ? "bg-navy-900 text-white shadow-card"
              : "border border-slate-300 text-slate-500 hover:border-navy-300 hover:text-navy-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
