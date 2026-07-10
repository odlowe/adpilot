"use client";

import { Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_CATEGORIES } from "./CampaignModal";
import Slider from "@/components/ui/Slider";
import { readError } from "@/lib/client";
import type { Campaign, Platform, PlatformSplit } from "@/lib/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PLATFORM_LABELS: Record<Platform, string> = {
  google: "Google Ads",
  meta: "Meta Ads (Instagram & Facebook)",
  reddit: "Reddit Ads",
};

/**
 * Edit any part of a campaign mid-flight: name, budget, location, duration,
 * radius, search terms, budget split per platform, and where the ads appear.
 */
export default function EditCampaignModal({
  campaign,
  onManageImages,
  onClose,
}: {
  campaign: Campaign;
  /** Opens the campaign image manager (this modal closes first). */
  onManageImages: () => void;
  onClose: () => void;
}) {
  const creatives =
    (campaign.creativesJson ?? []).length > 0
      ? campaign.creativesJson
      : campaign.creativeUrl
        ? [{ url: campaign.creativeUrl, format: "custom" as const, createdAt: campaign.createdAt }]
        : [];
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [industryText, setIndustryText] = useState(campaign.industryText);
  const [budget, setBudget] = useState(campaign.budget);
  const [zip, setZip] = useState(campaign.zip);
  const [duration, setDuration] = useState(campaign.durationMonths);
  const [continuous, setContinuous] = useState(campaign.continuous);
  const [radius, setRadius] = useState(campaign.targetingJson.radiusMiles);

  // search terms (Google keywords)
  const [keywords, setKeywords] = useState<string[]>(campaign.targetingJson.googleKeywords);
  const [keywordInput, setKeywordInput] = useState("");

  // budget split + placements
  const [split, setSplit] = useState<PlatformSplit>({ ...campaign.platformSplit });
  const [siteCategories, setSiteCategories] = useState<string[]>(campaign.siteCategories);
  const [customSites, setCustomSites] = useState<string[]>(campaign.customSites);
  const [siteInput, setSiteInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = Math.round(budget * 0.15);

  /** Move one platform's share; the other two absorb the difference proportionally. */
  function adjustSplit(platform: Platform, value: number) {
    const others = (Object.keys(split) as Platform[]).filter((p) => p !== platform);
    const remainder = 100 - value;
    const otherTotal = split[others[0]] + split[others[1]];
    const first =
      otherTotal > 0 ? Math.round((split[others[0]] / otherTotal) * remainder) : Math.round(remainder / 2);
    setSplit({
      [platform]: value,
      [others[0]]: first,
      [others[1]]: remainder - first,
    } as PlatformSplit);
  }

  function toggleCategory(category: string) {
    setSiteCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  }

  function addCustomSite() {
    const site = siteInput.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (site && !customSites.includes(site)) setCustomSites((current) => [...current, site]);
    setSiteInput("");
  }

  function addKeyword() {
    const term = keywordInput.trim().toLowerCase();
    if (term && !keywords.includes(term)) setKeywords((current) => [...current, term]);
    setKeywordInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const splitChanged = JSON.stringify(split) !== JSON.stringify(campaign.platformSplit);
    const sitesChanged =
      JSON.stringify(siteCategories) !== JSON.stringify(campaign.siteCategories) ||
      JSON.stringify(customSites) !== JSON.stringify(campaign.customSites);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            name,
            industryText,
            budget,
            zip,
            durationMonths: duration,
            continuous,
            radiusMiles: radius,
            googleKeywords: keywords,
            ...(splitChanged ? { platformSplit: split } : {}),
            ...(sitesChanged ? { siteCategories, customSites } : {}),
          },
        }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("No connection — check your internet and try again. Your changes weren't lost; just hit Save again.");
    } finally {
      setSaving(false);
    }
  }

  const chipInputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-7 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Edit campaign</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Changes apply from today — money already spent stays spent.
        </p>

        <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="camp-name">
          Campaign name
        </label>
        <input
          id="camp-name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <div className="mt-5">
          <Slider
            label="Monthly budget"
            min={250}
            max={5000}
            step={50}
            value={budget}
            onChange={setBudget}
            format={money}
            leftHint="$250"
            rightHint="$5,000"
          />
          <p className="mt-2 text-sm text-slate-500">
            {money(budget)} + {money(fee)} fee ={" "}
            <span className="font-bold text-navy-900">{money(budget + fee)}/month</span>
          </p>
        </div>

        <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="camp-audience">
          Your target customer
        </label>
        <p className="mt-0.5 text-xs text-slate-400">
          Plain English — change this (or the radius) and your agent rewrites the
          campaign&apos;s ad copy and targeting to match when you save.
        </p>
        <textarea
          id="camp-audience"
          rows={3}
          minLength={12}
          value={industryText}
          onChange={(e) => setIndustryText(e.target.value)}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="camp-zip">
          ZIP code or address
        </label>
        <input
          id="camp-zip"
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="The center of your targeting circle"
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <div className="mt-5">
          <Slider
            label="Local radius"
            min={1}
            max={50}
            value={radius}
            onChange={setRadius}
            format={(v) => `${v} mile${v === 1 ? "" : "s"}`}
            leftHint="1 mile"
            rightHint="50 miles"
          />
        </div>

        <div className={`mt-5 transition ${continuous ? "pointer-events-none opacity-40" : ""}`}>
          <Slider
            label="Duration"
            min={1}
            max={6}
            value={duration}
            onChange={setDuration}
            format={(v) => `${v} month${v === 1 ? "" : "s"}`}
            leftHint="1 month"
            rightHint="6 months"
          />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={continuous}
            onChange={(e) => setContinuous(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Continuous / Ongoing
        </label>

        {/* search terms */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <Search size={15} className="text-emerald-600" /> Search terms
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            What people type into Google when your ad should show up.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder='e.g., "bakery near me" — press Enter to add'
              className={chipInputClass}
            />
            <button
              type="button"
              onClick={addKeyword}
              aria-label="Add search term"
              className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              <Plus size={16} />
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {keywords.map((term) => (
                <span
                  key={term}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {term}
                  <button
                    type="button"
                    onClick={() => setKeywords((current) => current.filter((k) => k !== term))}
                    aria-label={`Remove ${term}`}
                    className="text-slate-400 hover:text-navy-900"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* budget split */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <SlidersHorizontal size={15} className="text-emerald-600" /> Budget split across platforms
          </p>
          <div className="mt-4 space-y-4">
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => (
              <div key={platform}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy-900">{PLATFORM_LABELS[platform]}</span>
                  <span className="tabular-nums font-bold text-emerald-700">
                    {split[platform]}% · {money(Math.round((budget * split[platform]) / 100))}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={split[platform]}
                  onChange={(e) => adjustSplit(platform, Number(e.target.value))}
                  className="ap-range mt-1.5"
                  style={{
                    background: `linear-gradient(to right, #059669 0%, #10b981 ${split[platform]}%, #e2e8f0 ${split[platform]}%, #e2e8f0 100%)`,
                  }}
                  aria-label={`${PLATFORM_LABELS[platform]} share of budget`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Always adds up to 100% — move one dial and the others rebalance.
          </p>
        </div>

        {/* placements */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="text-sm font-bold text-navy-900">Types of websites to appear on</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SITE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  siteCategories.includes(category)
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-navy-400"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm font-bold text-navy-900">Specific websites</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSite();
                }
              }}
              placeholder="e.g., yourlocalnews.com — press Enter to add"
              className={chipInputClass}
            />
            <button
              type="button"
              onClick={addCustomSite}
              aria-label="Add website"
              className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              <Plus size={16} />
            </button>
          </div>
          {customSites.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {customSites.map((site) => (
                <span
                  key={site}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {site}
                  <button
                    type="button"
                    onClick={() => setCustomSites((current) => current.filter((s) => s !== site))}
                    aria-label={`Remove ${site}`}
                    className="text-slate-400 hover:text-navy-900"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ---- campaign images ---- */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy-900">
              Ad images{creatives.length > 0 ? ` (${creatives.length})` : ""}
            </p>
            <button
              type="button"
              onClick={onManageImages}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"
            >
              Preview &amp; edit images
            </button>
          </div>
          {creatives.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {creatives.slice(0, 6).map((c, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${c.url.slice(-16)}-${i}`}
                  src={c.url}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                />
              ))}
              {creatives.length > 6 && (
                <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-400">
                  +{creatives.length - 6}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No images yet — add some from the image manager.</p>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  );
}
