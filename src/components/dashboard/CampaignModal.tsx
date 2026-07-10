"use client";

import {
  CheckCircle2,
  Gauge,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Wand2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import CampaignPreview from "./CampaignPreview";
import CreativeUploader from "./CreativeUploader";
import Slider from "@/components/ui/Slider";
import { readError, startCheckout } from "@/lib/client";
import { CREATIVE_FORMATS, FORMAT_LABELS } from "@/lib/creative-formats";
import type { CampaignCreative, CampaignDraft, CampaignPlan, Platform, PlatformSplit } from "@/lib/types";

export const SITE_CATEGORIES = [
  "Local news sites",
  "Food & recipe blogs",
  "Parenting & family",
  "Home & DIY",
  "Health & fitness",
  "Sports",
  "Shopping & deals",
  "Entertainment",
  "Community forums",
  "Tech & gadgets",
];

const PLATFORM_LABELS: Record<Platform, string> = {
  google: "Google Ads",
  meta: "Meta Ads (Instagram & Facebook)",
  reddit: "Reddit Ads",
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Phase = "editing" | "generating" | "preview" | "launching" | "launched";

interface CampaignModalProps {
  businessId: string;
  businessName: string;
  initialDraft?: CampaignDraft | null;
  onClose: () => void;
  onLaunched: () => void;
}

/** The 3-slider configurator in a modal: configure → preview → Launch Everywhere. */
export default function CampaignModal({
  businessId,
  businessName,
  initialDraft,
  onClose,
  onLaunched,
}: CampaignModalProps) {
  const [intentText, setIntentText] = useState(initialDraft?.intentText ?? "");
  const [budget, setBudget] = useState(initialDraft?.budget ?? 1000);
  const [radius, setRadius] = useState(initialDraft?.radiusMiles ?? 15);
  const [zip, setZip] = useState(initialDraft?.zip ?? "");
  const [duration, setDuration] = useState(initialDraft?.durationMonths ?? 1);
  const [continuous, setContinuous] = useState(initialDraft?.continuous ?? false);
  const [phase, setPhase] = useState<Phase>("editing");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creativeUrl, setCreativeUrl] = useState<string | null>(null);

  // AI visual generator
  interface AiReference {
    name: string;
    mimeType: string;
    data: string; // base64, no data-URL prefix
  }
  const MAX_AI_REFS = 3;
  type FormatKey = (typeof CREATIVE_FORMATS)[number]["key"];
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRefs, setAiRefs] = useState<AiReference[]>([]);
  const [aiFormats, setAiFormats] = useState<FormatKey[]>(CREATIVE_FORMATS.map((f) => f.key));
  const [aiBusyMap, setAiBusyMap] = useState<Partial<Record<FormatKey, boolean>>>({});
  const [aiCreatives, setAiCreatives] = useState<CampaignCreative[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRefInputRef = useRef<HTMLInputElement>(null);
  const aiBusy = Object.values(aiBusyMap).some(Boolean);

  /** Shrink a reference photo to ≤1024px JPEG so the request stays light. */
  async function fileToReference(file: File): Promise<AiReference | null> {
    if (!file.type.startsWith("image/")) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      if (!base64) return null;
      return { name: file.name, mimeType: "image/jpeg", data: base64 };
    } catch {
      return null;
    }
  }

  async function addReferences(files: FileList | null) {
    if (!files) return;
    setAiError(null);
    const room = MAX_AI_REFS - aiRefs.length;
    const picked = Array.from(files).slice(0, room);
    const converted = (await Promise.all(picked.map(fileToReference))).filter(
      (r): r is AiReference => r !== null
    );
    if (converted.length > 0) setAiRefs((prev) => [...prev, ...converted].slice(0, MAX_AI_REFS));
  }

  /** Generates every selected size in parallel; each lands as it finishes. */
  async function generateVisual() {
    if (aiBusy || aiPrompt.trim().length < 4 || aiFormats.length === 0) return;
    const prompt = aiPrompt.trim();
    setAiError(null);
    setAiBusyMap(Object.fromEntries(aiFormats.map((f) => [f, true])));

    await Promise.all(
      aiFormats.map(async (format) => {
        try {
          const res = await fetch("/api/creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              businessId,
              businessName,
              format,
              references: aiRefs.map(({ mimeType, data }) => ({ mimeType, data })),
            }),
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            setAiError(data.error ?? "Couldn't generate a visual — please try again.");
            return;
          }
          const creative: CampaignCreative = {
            url: data.url,
            format,
            prompt,
            createdAt: new Date().toISOString(),
          };
          setAiCreatives((prev) => [...prev.filter((c) => c.format !== format), creative]);
          // First finished image becomes the campaign's primary creative
          // unless the owner uploaded their own file.
          setCreativeUrl((current) => current ?? data.url ?? null);
        } catch {
          setAiError("No connection — check your internet and try again.");
        } finally {
          setAiBusyMap((prev) => ({ ...prev, [format]: false }));
        }
      })
    );
  }

  function removeAiCreative(format: CampaignCreative["format"]) {
    setAiCreatives((prev) => {
      const next = prev.filter((c) => c.format !== format);
      setCreativeUrl((current) => {
        const removed = prev.find((c) => c.format === format);
        return current === removed?.url ? next[0]?.url ?? null : current;
      });
      return next;
    });
  }

  // Manual Mode
  const [manualMode, setManualMode] = useState(false);
  const [split, setSplit] = useState<PlatformSplit>({ google: 34, meta: 33, reddit: 33 });
  const [siteCategories, setSiteCategories] = useState<string[]>([]);
  const [customSites, setCustomSites] = useState<string[]>([]);
  const [siteInput, setSiteInput] = useState("");

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

  const fee = Math.round(budget * 0.15);
  const busy = phase === "generating" || phase === "launching";

  async function handleGenerate() {
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentText, budget, radiusMiles: radius, businessId }),
      });
      if (!res.ok) {
        setError(await readError(res));
        setPhase("editing");
        return;
      }
      const data = (await res.json()) as { plan?: CampaignPlan };
      if (!data.plan) {
        setError("Something went wrong. Please try again.");
        setPhase("editing");
        return;
      }
      setPlan(data.plan);
      setPhase("preview");
    } catch {
      setError("No connection — check your internet and try again.");
      setPhase("editing");
    }
  }

  async function handleLaunch() {
    if (!plan) return;
    setError(null);
    setPhase("launching");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          budget,
          zip,
          durationMonths: duration,
          continuous,
          manualMode,
          platformSplit: split,
          siteCategories,
          customSites,
          creativeUrl,
          creatives: [
            ...(creativeUrl && !aiCreatives.some((c) => c.url === creativeUrl)
              ? [{ url: creativeUrl, format: "custom", createdAt: new Date().toISOString() }]
              : []),
            ...aiCreatives,
          ],
          industryText: intentText,
          plan,
        }),
      });
      if (!res.ok) {
        setError(await readError(res));
        setPhase("preview");
        return;
      }

      // Billing switched on? Hand the owner to Stripe's payment page.
      // The campaign is already created either way — a cancelled checkout
      // just leaves it in preview mode.
      try {
        const payUrl = await startCheckout(`${businessName} — ${intentText.slice(0, 40)}`, budget);
        if (payUrl) {
          window.location.href = payUrl;
          return;
        }
      } catch {
        // Checkout hiccup shouldn't undo a successful launch.
      }

      setPhase("launched");
      onLaunched();
    } catch {
      setError("No connection — check your internet and try again.");
      setPhase("preview");
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-slate-50 shadow-lift">
        {/* header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">New campaign</h2>
            <p className="text-sm text-slate-500">for {businessName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {phase === "launched" ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={34} className="text-emerald-600" />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-navy-900">
                Your campaign is on its way!
              </h3>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                Submitted to Google, Instagram, and Reddit for a quick review — most campaigns go
                live within 24 hours. We&apos;ll take it from here.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-7 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800"
              >
                Back to my dashboard
              </button>
            </div>
          ) : (
            <>
              <label className="text-sm font-semibold text-navy-900" htmlFor="modal-intent">
                Describe Your Target Customer in Plain English
              </label>
              <textarea
                id="modal-intent"
                rows={3}
                value={intentText}
                onChange={(e) => setIntentText(e.target.value)}
                placeholder="e.g., I run a boutique dress shop in town and want to target moms who care about sustainable, eco-friendly clothing..."
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />

              <div className="mt-6 space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Gauge size={15} className="text-emerald-600" /> The Fuel Dial — monthly budget
                  </p>
                  <div className="mt-3">
                    <Slider label="" min={250} max={5000} step={50} value={budget} onChange={setBudget} format={money} leftHint="$250" rightHint="$5,000" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {money(budget)} to networks + {money(fee)} fee (15%) ={" "}
                    <span className="font-bold text-navy-900">{money(budget + fee)} total billing</span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <MapPin size={15} className="text-emerald-600" /> The Distance Dial — local radius
                  </p>
                  <div className="mt-3">
                    <Slider label="" min={1} max={50} value={radius} onChange={setRadius} format={(v) => `${v} mile${v === 1 ? "" : "s"}`} leftHint="1 mile" rightHint="50 miles" />
                  </div>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP code or business address"
                    className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Timer size={15} className="text-emerald-600" /> The Speed Dial — duration
                  </p>
                  <div className={`mt-3 transition ${continuous ? "pointer-events-none opacity-40" : ""}`}>
                    <Slider label="" min={1} max={6} value={duration} onChange={setDuration} format={(v) => `${v} month${v === 1 ? "" : "s"}`} leftHint="1 month" rightHint="6 months" />
                  </div>
                  <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={continuous}
                      onChange={(e) => setContinuous(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Continuous / Ongoing — run month to month, pause anytime
                  </label>
                </div>

                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Ad photo or video <span className="font-normal text-slate-400">(optional)</span>
                  </p>
                  <div className="mt-2">
                    <CreativeUploader onUploaded={setCreativeUrl} />
                  </div>

                  {/* ---- AI visual generator ---- */}
                  <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                      <Sparkles size={15} className="text-emerald-600" /> …or let your agent design one
                    </p>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={aiBusy}
                      rows={2}
                      placeholder="Describe the photo in detail — what's in it, the mood, the setting. e.g. our bakery counter at sunrise, fresh sourdough front and center, warm morning light"
                      className="mt-2.5 w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={aiRefInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void addReferences(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => aiRefInputRef.current?.click()}
                        disabled={aiBusy || aiRefs.length >= MAX_AI_REFS}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                      >
                        <ImagePlus size={13} />
                        {aiRefs.length > 0 ? `Reference photos (${aiRefs.length}/${MAX_AI_REFS})` : "Add reference photos"}
                      </button>
                      {aiRefs.map((ref, i) => (
                        <span key={`${ref.name}-${i}`} className="relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:${ref.mimeType};base64,${ref.data}`}
                            alt={ref.name}
                            className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove ${ref.name}`}
                            onClick={() => setAiRefs((prev) => prev.filter((_, j) => j !== i))}
                            disabled={aiBusy}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-500 shadow-card transition hover:text-red-600"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => void generateVisual()}
                        disabled={aiBusy || aiPrompt.trim().length < 4 || aiFormats.length === 0}
                        className="ml-auto flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:opacity-50"
                      >
                        {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        AI Generate Visuals
                      </button>
                    </div>

                    {/* sizes to produce */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="text-xs font-semibold text-slate-500">Sizes:</span>
                      {CREATIVE_FORMATS.map((f) => (
                        <label key={f.key} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={aiFormats.includes(f.key)}
                            disabled={aiBusy}
                            onChange={(e) =>
                              setAiFormats((prev) =>
                                e.target.checked ? [...prev, f.key] : prev.filter((k) => k !== f.key)
                              )
                            }
                            className="h-3.5 w-3.5 accent-emerald-600"
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>

                    {aiError && !aiBusy && (
                      <p className="mt-2 text-xs font-medium text-red-600">{aiError}</p>
                    )}

                    {(aiCreatives.length > 0 || aiBusy) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {CREATIVE_FORMATS.filter(
                          (f) => aiBusyMap[f.key] || aiCreatives.some((c) => c.format === f.key)
                        ).map((f) => {
                          const made = aiCreatives.find((c) => c.format === f.key);
                          return (
                            <div key={f.key} className="rounded-xl border border-slate-200 bg-white p-2.5">
                              <p className="text-[11px] font-semibold text-slate-500">{FORMAT_LABELS[f.key]}</p>
                              {aiBusyMap[f.key] ? (
                                <div className="mt-1.5 flex aspect-video w-full animate-pulse flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-200">
                                  <Sparkles size={16} className="animate-pulse text-emerald-600" />
                                  <span className="text-[11px] font-medium text-slate-500">Creating…</span>
                                </div>
                              ) : made ? (
                                <div className="relative mt-1.5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={made.url}
                                    alt={`AI ${f.label} ad`}
                                    className="w-full rounded-lg border border-slate-100 object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeAiCreative(f.key)}
                                    aria-label={`Remove ${f.label}`}
                                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 shadow-card transition hover:text-red-600"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {aiCreatives.length > 0 && !aiBusy && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} /> {aiCreatives.length} image{aiCreatives.length === 1 ? "" : "s"} attached — every size launches with the campaign
                      </p>
                    )}
                  </div>
                </div>

                {/* ---- Manual Mode ---- */}
                <div className={`rounded-xl border p-5 transition ${manualMode ? "border-navy-300 bg-navy-50/40" : "border-dashed border-slate-300 bg-white"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                        <SlidersHorizontal size={15} className="text-emerald-600" /> Manual Mode
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {manualMode
                          ? "You're driving. Set the exact split and where your ads appear."
                          : "Optional — take the wheel from your agent and set the details yourself."}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={manualMode}
                      onClick={() => setManualMode((v) => !v)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${manualMode ? "bg-navy-900" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${manualMode ? "left-[22px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>

                  {manualMode ? (
                    <div className="mt-5 space-y-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Budget split across platforms
                        </p>
                        <div className="mt-3 space-y-4">
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

                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Types of websites to appear on
                        </p>
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
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Specific websites (optional)
                        </p>
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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
                                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
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
                    </div>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Sparkles size={13} className="text-emerald-500" />
                      Leave this off and your agent balances platforms and placements automatically.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                  {error}
                </p>
              )}

              {phase === "generating" && (
                <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-7 text-center">
                  <Loader2 size={24} className="mx-auto animate-spin text-emerald-600" />
                  <p className="mt-3 font-semibold text-navy-900">Writing your ads and mapping your audience…</p>
                  <p className="mt-1 text-sm text-slate-500">Usually done in a few seconds.</p>
                </div>
              )}

              {plan && (phase === "preview" || phase === "launching") && (
                <div className="mt-6">
                  <CampaignPreview plan={plan} />
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy || intentText.trim().length < 12}
                  className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wand2 size={16} className="text-emerald-400" />
                  {plan ? "Regenerate Preview" : "Generate Campaign Preview"}
                </button>
                {plan && (
                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {phase === "launching" ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    Launch Everywhere
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
