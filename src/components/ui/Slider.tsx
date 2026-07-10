"use client";

import { useId } from "react";

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** Formats the big value readout (e.g. "$500" or "10 miles"). */
  format?: (value: number) => string;
  leftHint?: string;
  rightHint?: string;
}

/**
 * The signature control of the app: a large, friendly range slider with a
 * live value readout and an emerald progress fill.
 */
export default function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v) => String(v),
  leftHint,
  rightHint,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-navy-900">
          {label}
        </label>
        <span className="rounded-lg bg-emerald-50 px-3 py-1 text-lg font-bold tabular-nums text-emerald-700 ring-1 ring-emerald-200">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ap-range mt-3"
        style={{
          background: `linear-gradient(to right, #059669 0%, #10b981 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
        }}
      />
      {(leftHint || rightHint) && (
        <div className="mt-1.5 flex justify-between text-xs font-medium text-slate-400">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
    </div>
  );
}
