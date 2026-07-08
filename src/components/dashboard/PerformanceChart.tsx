"use client";

import type { DayPoint } from "@/lib/metrics";

/**
 * Dependency-free interactive SVG chart: bars are daily views (impressions),
 * the emerald line is daily clicks. Hover any day for exact numbers.
 */
export default function PerformanceChart({ series }: { series: DayPoint[] }) {
  const W = 640;
  const H = 240;
  const PAD = { top: 18, right: 12, bottom: 28, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxImpressions = Math.max(1, ...series.map((d) => d.impressions));
  const maxClicks = Math.max(1, ...series.map((d) => d.clicks));
  const n = series.length;
  const slot = innerW / n;
  const barW = Math.max(4, slot * 0.55);

  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const yImp = (v: number) => PAD.top + innerH - (v / maxImpressions) * innerH;
  const yClk = (v: number) => PAD.top + innerH - (v / maxClicks) * innerH * 0.92;

  const linePath = series
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yClk(d.clicks).toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy-200" /> Views per day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-emerald-500" /> Clicks per day
        </span>
        <span className="ml-auto text-slate-400">Last 30 days · hover for details</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Daily views and clicks over the last 30 days"
      >
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * (1 - f)}
            y2={PAD.top + innerH * (1 - f)}
            stroke="#e2e8f0"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* bars */}
        {series.map((d, i) => (
          <rect
            key={d.date}
            x={x(i) - barW / 2}
            y={yImp(d.impressions)}
            width={barW}
            height={PAD.top + innerH - yImp(d.impressions)}
            rx={2}
            className="fill-navy-200 transition-colors hover:fill-navy-400"
          >
            <title>{`${d.label}\nViews: ${d.impressions.toLocaleString()}\nClicks: ${d.clicks.toLocaleString()}`}</title>
          </rect>
        ))}

        {/* clicks line */}
        <path d={linePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />
        {series.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={yClk(d.clicks)} r="3" fill="#059669" className="opacity-0 hover:opacity-100">
            <title>{`${d.label} — Clicks: ${d.clicks.toLocaleString()}`}</title>
          </circle>
        ))}

        {/* x labels (weekly) */}
        {series.map((d, i) =>
          i % 7 === 3 ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {d.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
