"use client";

import { Check, Download, ImagePlus, Loader2, RefreshCw, Trash2, Wand2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CREATIVE_FORMATS, FORMAT_LABELS } from "@/lib/creative-formats";
import { readError } from "@/lib/client";
import type { Campaign, CampaignCreative, CreativeFormat } from "@/lib/types";

/**
 * The campaign's image library: every ad size in one place, with
 * remove / add / regenerate / download. Nothing touches the campaign until
 * "Update campaign" is clicked — Cancel discards. Opens from the campaign
 * card thumbnail and from the Edit Campaign screen.
 */
export default function CreativeManagerModal({
  campaign,
  finishLabel = "Update campaign",
  onClose,
}: {
  campaign: Campaign;
  /** Save-button label — changes when arriving from the Edit Campaign screen. */
  finishLabel?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  const initial: CampaignCreative[] =
    (campaign.creativesJson ?? []).length > 0
      ? campaign.creativesJson
      : campaign.creativeUrl
        ? [{ url: campaign.creativeUrl, format: "custom", createdAt: campaign.createdAt }]
        : [];

  const [creatives, setCreatives] = useState<CampaignCreative[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Generate new" mini-form
  const [genPrompt, setGenPrompt] = useState("");
  const [genFormat, setGenFormat] = useState<Exclude<CreativeFormat, "custom">>("landscape");

  const anyBusy = saving || uploading || generating || busyIndex !== null;

  function update(next: CampaignCreative[]) {
    setCreatives(next);
    setDirty(true);
  }

  /** The one write: saves the set; the first image becomes the thumbnail. */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { creatives } }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty && !window.confirm("Discard your image changes?")) return;
    onClose();
  }

  async function regenerate(index: number) {
    const target = creatives[index];
    if (!target || target.format === "custom") return;
    setBusyIndex(index);
    setError(null);
    try {
      const res = await fetch("/api/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: target.prompt ?? campaign.industryText,
          businessId: campaign.businessId,
          format: target.format,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't regenerate — please try again.");
        return;
      }
      const next = [...creatives];
      next[index] = { ...target, url: data.url, createdAt: new Date().toISOString() };
      update(next);
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setBusyIndex(null);
    }
  }

  async function generateNew() {
    if (generating || genPrompt.trim().length < 4) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: genPrompt.trim(),
          businessId: campaign.businessId,
          format: genFormat,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't generate — please try again.");
        return;
      }
      update([
        ...creatives,
        {
          url: data.url,
          format: genFormat,
          prompt: genPrompt.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setGenPrompt("");
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const added: CampaignCreative[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json()) as { url?: string; error?: string };
        if (res.ok && data.url) {
          added.push({ url: data.url, format: "custom", createdAt: new Date().toISOString() });
        } else {
          setError(data.error ?? "One of the uploads failed.");
        }
      }
      if (added.length > 0) update([...creatives, ...added]);
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setUploading(false);
    }
  }

  /** Downloads through a blob so it works for cross-origin storage URLs. */
  async function download(creative: CampaignCreative, index: number) {
    try {
      const res = await fetch(creative.url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] ?? "png").split("+")[0];
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${campaign.name.replace(/[^\w-]+/g, "_")}-${creative.format}-${index + 1}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      setError("Couldn't download that image — try opening it in a new tab instead.");
    }
  }

  const isVideo = (url: string) => url.startsWith("data:video") || /\.(mp4|webm|mov)($|\?)/i.test(url);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900">Campaign images</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {campaign.name} — the first image is the campaign thumbnail. Changes apply when you
              hit &ldquo;{finishLabel}&rdquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={cancel}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        {creatives.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No images yet — generate or upload one below.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {creatives.map((creative, i) => (
              <div key={`${creative.url.slice(-24)}-${i}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {FORMAT_LABELS[creative.format]}
                  </span>
                  {i === 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700">Thumbnail</span>
                  )}
                </div>
                {busyIndex === i ? (
                  <div className="mt-2 flex aspect-video w-full animate-pulse flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-200">
                    <Loader2 size={18} className="animate-spin text-slate-500" />
                    <span className="text-[11px] font-medium text-slate-500">Regenerating…</span>
                  </div>
                ) : isVideo(creative.url) ? (
                  <video src={creative.url} muted loop autoPlay playsInline className="mt-2 w-full rounded-lg border border-slate-100 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creative.url} alt="" className="mt-2 w-full rounded-lg border border-slate-100 object-contain" />
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  {creative.format !== "custom" && (
                    <button
                      type="button"
                      disabled={anyBusy}
                      onClick={() => void regenerate(i)}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                    >
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void download(creative, i)}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-navy-400 hover:text-navy-900"
                  >
                    <Download size={11} /> Download
                  </button>
                  <button
                    type="button"
                    disabled={anyBusy}
                    onClick={() => update(creatives.filter((_, j) => j !== i))}
                    className="ml-auto flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* add: generate or upload */}
        <div className="mt-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
          <p className="text-sm font-bold text-navy-900">Add an image</p>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void generateNew();
                }
              }}
              disabled={generating}
              placeholder="Describe a new ad image…"
              className="w-full flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            />
            <select
              value={genFormat}
              onChange={(e) => setGenFormat(e.target.value as typeof genFormat)}
              disabled={generating}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              {CREATIVE_FORMATS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void generateNew()}
              disabled={generating || genPrompt.trim().length < 4}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-navy-800 disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Generate
            </button>
          </div>
          <div className="mt-2.5">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              Upload your own photo or video
            </button>
          </div>
        </div>

        {/* footer: explicit save */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          {dirty && !saving && (
            <span className="mr-auto text-xs font-medium text-amber-600">Unsaved image changes</span>
          )}
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={anyBusy}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {finishLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
