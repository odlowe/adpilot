"use client";

import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Slider from "@/components/ui/Slider";

const FEE_RATE = 0.15;

const INCLUDED = [
  "Ad copy written and refreshed by your automated agent",
  "Placement on Google, Instagram & Reddit — one campaign, three platforms",
  "Local radius targeting tuned to your neighborhood",
  "Ongoing optimization: budget shifts toward whatever is working",
  "Plain-English performance updates, no dashboards to decode",
];

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Pricing() {
  const [spend, setSpend] = useState(500);
  const fee = Math.round(spend * FEE_RATE);
  const total = spend + fee;

  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            One simple fee. No surprises.
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            You choose your ad budget — every dollar of it goes to your ads. We
            add a flat <span className="font-semibold text-navy-900">15% management fee</span> for
            your automated agent. That&apos;s the whole pricing page.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-5">
          {/* Live calculator */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 shadow-card lg:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Try the math yourself
            </h3>
            <div className="mt-6">
              <Slider
                label="Monthly ad budget"
                min={250}
                max={5000}
                step={50}
                value={spend}
                onChange={setSpend}
                format={money}
                leftHint="$250"
                rightHint="$5,000"
              />
            </div>
            <dl className="mt-7 space-y-3 text-[15px]">
              <div className="flex items-center justify-between text-slate-700">
                <dt>Goes straight to your ads</dt>
                <dd className="font-semibold tabular-nums">{money(spend)}</dd>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <dt>Software fee (15%) — your agent&apos;s salary</dt>
                <dd className="font-semibold tabular-nums">{money(fee)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-300 pt-3 text-lg font-bold text-navy-900">
                <dt>Total monthly billing</dt>
                <dd className="tabular-nums text-emerald-700">{money(total)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-500">
              Example: {money(spend)} ad spend + {money(fee)} software fee ={" "}
              {money(total)} total. Change the slider — the math updates
              instantly, here and in your dashboard.
            </p>
          </div>

          {/* What's included */}
          <div className="rounded-2xl border border-navy-800 bg-navy-900 p-7 text-white shadow-lift lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
              Always included
            </h3>
            <ul className="mt-5 space-y-3.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-200">
                  <BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-7 block rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Launch Your First Ad Free
            </Link>
            <p className="mt-3 text-center text-xs text-slate-400">
              No contracts. Cancel or pause anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
