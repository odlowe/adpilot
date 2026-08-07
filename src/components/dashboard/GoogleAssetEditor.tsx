"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import type { PmaxAssets } from "@/lib/types";

/**
 * The editable Google asset group shown under the campaign preview.
 * Everything the AI wrote — headlines, descriptions, themes, selling points —
 * can be tweaked before launch; edited values win over the AI's.
 * Char limits are Google's hard rules, enforced here with maxLength + counters.
 */
export default function GoogleAssetEditor({
  pmax,
  onChange,
  disabled,
}: {
  pmax: PmaxAssets;
  onChange: (next: PmaxAssets) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const set = <K extends keyof PmaxAssets>(key: K, value: PmaxAssets[K]) =>
    onChange({ ...pmax, [key]: value });

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] font-black text-white">G</span>
            Your Google ad assets
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              AI-written · editable
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {pmax.headlines.length} headlines · {pmax.descriptions.length} descriptions ·{" "}
            {pmax.searchThemes.length} search themes — tap to review or edit before launch
          </p>
        </div>
        <Pencil size={15} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 p-6">
          <div>
            <FieldLabel text="Business name on the ad" hint="25 characters max" />
            <div className="relative mt-1.5">
              <input
                type="text"
                value={pmax.businessNameShort}
                maxLength={25}
                disabled={disabled}
                onChange={(e) => set("businessNameShort", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-16 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
              <Counter value={pmax.businessNameShort} max={25} />
            </div>
          </div>

          <EditableLines
            label="Short headlines"
            hint="Google mixes & matches these — 30 characters each"
            values={pmax.headlines}
            max={30}
            maxItems={15}
            minItems={3}
            disabled={disabled}
            onChange={(v) => set("headlines", v)}
          />
          <EditableLines
            label="Long headlines"
            hint="Shown in bigger placements — 90 characters each"
            values={pmax.longHeadlines}
            max={90}
            maxItems={5}
            minItems={1}
            disabled={disabled}
            onChange={(v) => set("longHeadlines", v)}
          />
          <EditableLines
            label="Descriptions"
            hint="The small print under the headline — 90 characters each"
            values={pmax.descriptions}
            max={90}
            maxItems={5}
            minItems={2}
            disabled={disabled}
            onChange={(v) => set("descriptions", v)}
          />
          <EditableLines
            label="What makes you special"
            hint="Selling points Google weaves into your ads"
            values={pmax.uniqueSellingPoints}
            max={90}
            maxItems={6}
            minItems={0}
            disabled={disabled}
            onChange={(v) => set("uniqueSellingPoints", v)}
          />
          <ChipEditor
            label="Search themes"
            hint="What locals type into Google when they need you"
            values={pmax.searchThemes}
            max={80}
            maxItems={12}
            disabled={disabled}
            onChange={(v) => set("searchThemes", v)}
          />
          <ChipEditor
            label="What you're selling"
            hint="Short product or service terms"
            values={pmax.productTerms}
            max={60}
            maxItems={8}
            disabled={disabled}
            onChange={(v) => set("productTerms", v)}
          />

          <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            Your ad images, logo, and any linked YouTube video attach automatically from this
            campaign and your business profile.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ text, hint }: { text: string; hint: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
      {text} <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">— {hint}</span>
    </p>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length >= max;
  return (
    <span
      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums ${
        over ? "text-amber-600" : "text-slate-300"
      }`}
    >
      {value.length}/{max}
    </span>
  );
}

function EditableLines({
  label,
  hint,
  values,
  max,
  maxItems,
  minItems,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  max: number;
  maxItems: number;
  minItems: number;
  disabled?: boolean;
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <div className="mt-1.5 space-y-1.5">
        {values.map((value, i) => (
          <div key={i} className="relative flex items-center gap-1.5">
            <div className="relative w-full">
              <input
                type="text"
                value={value}
                maxLength={max}
                disabled={disabled}
                onChange={(e) =>
                  onChange(values.map((v, j) => (j === i ? e.target.value : v)))
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 pr-16 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
              <Counter value={value} max={max} />
            </div>
            {values.length > minItems && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
                className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-rose-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {values.length < maxItems && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...values, ""])}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700 transition hover:text-emerald-600"
        >
          <Plus size={12} /> Add another
        </button>
      )}
    </div>
  );
}

function ChipEditor({
  label,
  hint,
  values,
  max,
  maxItems,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  max: number;
  maxItems: number;
  disabled?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const s = input.trim().slice(0, max);
    if (s && !values.some((v) => v.toLowerCase() === s.toLowerCase()) && values.length < maxItems) {
      onChange([...values, s]);
    }
    setInput("");
  }

  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {values.map((chip) => (
          <span
            key={chip}
            className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200"
          >
            {chip}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(values.filter((v) => v !== chip))}
              aria-label={`Remove ${chip}`}
              className="text-blue-400 transition hover:text-rose-600"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {values.length < maxItems && (
          <input
            type="text"
            value={input}
            disabled={disabled}
            maxLength={max}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="Type & press Enter"
            className="w-36 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-500"
          />
        )}
      </div>
    </div>
  );
}
