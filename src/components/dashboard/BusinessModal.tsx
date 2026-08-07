"use client";

import { AlertTriangle, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import ImageCropModal from "@/components/ui/ImageCropModal";
import { readError } from "@/lib/client";
import type { Business, BrandingImage, LinkedAccounts } from "@/lib/types";

/** Google requires square logos — every brand image leaves here 1200×1200. */
const BRAND_CROP = [{ key: "square", label: "Square", width: 1200, height: 1200 }];

const CATEGORIES = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Political Campaign",
  "Other",
];

interface BusinessModalProps {
  /** Present = edit mode; absent = create mode. */
  business?: Business;
  canDelete: boolean;
  onClose: () => void;
  /** Called with the saved/created business id, or null after deletion. */
  onSaved: (businessId: string | null) => void;
}

/** Create or edit a business, including the profile the AI draws on. */
export default function BusinessModal({ business, canDelete, onClose, onSaved }: BusinessModalProps) {
  const editing = Boolean(business);
  const [name, setName] = useState(business?.name ?? "");
  const [category, setCategory] = useState(business?.category ?? "Retail/Boutique");
  const [description, setDescription] = useState(business?.description ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [website, setWebsite] = useState(business?.website ?? "");
  const [branding, setBranding] = useState<BrandingImage[]>(business?.brandingJson ?? []);
  const [linked, setLinked] = useState<LinkedAccounts>(business?.linkedAccountsJson ?? {});
  const [uploadingBrand, setUploadingBrand] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/businesses/${business!.id}` : "/api/businesses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, description, address, phone, website, brandingImages: branding, linkedAccounts: linked }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      const data = (await res.json()) as { business?: Business };
      if (!data.business) {
        setError("Something went wrong.");
        return;
      }
      onSaved(data.business.id);
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setSaving(false);
    }
  }

  // Picked files wait in line for the square-crop step, one at a time —
  // each remembers whether it came in through the Logo door or the Photos door.
  const [cropQueue, setCropQueue] = useState<Array<{ file: File; label: BrandingImage["label"] }>>([]);

  function queueBranding(files: FileList | null, label: BrandingImage["label"]) {
    if (!files || files.length === 0) return;
    const room = Math.max(0, 8 - branding.length);
    const images = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room)
      .map((file) => ({ file, label }));
    if (images.length > 0) setCropQueue((prev) => [...prev, ...images]);
  }

  async function uploadCropped(dataUrl: string, label: BrandingImage["label"]) {
    setCropQueue((prev) => prev.slice(1));
    setUploadingBrand(true);
    setError(null);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData();
      form.append("file", new File([blob], "brand-square.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setBranding((prev) => [...prev, { url: data.url as string, label }]);
      } else {
        setError(data.error ?? "One of the uploads failed.");
      }
    } catch {
      setError("No connection — check your internet and try again.");
    } finally {
      setUploadingBrand(false);
    }
  }

  const hasLogo = branding.some((b) => b.label === "Logo");

  async function handleDelete() {
    if (!business) return;
    if (!window.confirm(`Delete "${business.name}" and all its campaigns? This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${business.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await readError(res));
        setDeleting(false);
        return;
      }
      onSaved(null);
    } catch {
      setError("No connection — check your internet and try again.");
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
  const labelClass = "mt-4 block text-sm font-semibold text-navy-900 first:mt-0";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-lg rounded-2xl bg-white p-7 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">
            {editing ? `Edit ${business!.name}` : "Add a new business"}
          </h2>
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
          {editing
            ? "The more your agent knows, the better it writes and targets your ads."
            : "Run campaigns for another shop, location, or venture — all under one login."}
        </p>

        <label className={`${labelClass} mt-5`} htmlFor="biz-name">Business name</label>
        <input
          id="biz-name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Main St. Bakery"
          className={`${inputClass} mt-1.5`}
        />

        <label className={labelClass} htmlFor="biz-category">Category</label>
        <select
          id="biz-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className={`${inputClass} mt-1.5 bg-white`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className={labelClass} htmlFor="biz-desc">
          What makes this business special?{" "}
          <span className="font-normal text-slate-400">(your agent reads this)</span>
        </label>
        <textarea
          id="biz-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Family-owned since 2009. Known for sourdough and cinnamon rolls. Regulars love the cozy back patio..."
          className={`${inputClass} mt-1.5 resize-y`}
        />

        <label className={labelClass} htmlFor="biz-address">Address</label>
        <input
          id="biz-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="142 Main Street, Springfield"
          className={`${inputClass} mt-1.5`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-navy-900" htmlFor="biz-phone">Phone</label>
            <input
              id="biz-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy-900" htmlFor="biz-web">Website</label>
            <input
              id="biz-web"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="mainstbakery.com"
              className={`${inputClass} mt-1.5`}
            />
          </div>
        </div>

        {/* ---- brand images ---- */}
        <label className={labelClass}>
          Brand images{" "}
          <span className="font-normal text-slate-400">(the AI puts these in your ads — Google needs the logo)</span>
        </label>

        {/* two doors: logo in one, everything else in the other */}
        <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingBrand || branding.length >= 8}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 transition disabled:opacity-50 ${
              hasLogo
                ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                : "border-amber-300 bg-amber-50/40 text-amber-700 hover:border-amber-500"
            }`}
          >
            {uploadingBrand ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
            <span className="text-xs font-bold">{hasLogo ? "Logo added ✓ — add another" : "Upload logo"}</span>
            <span className="text-[10px] font-medium opacity-70">
              {hasLogo ? "Square, ready for Google" : "Required for Google ads · cropped square"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => photosInputRef.current?.click()}
            disabled={uploadingBrand || branding.length >= 8}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50"
          >
            {uploadingBrand ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
            <span className="text-xs font-bold">Upload other images</span>
            <span className="text-[10px] font-medium opacity-70">Storefront · product / work · team</span>
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-start gap-2.5">
          {branding.map((img, i) => (
            <span key={`${img.url.slice(-16)}-${i}`} className="flex flex-col items-center gap-1">
              <span className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.label}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setBranding((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-500 shadow-card transition hover:text-red-600"
                >
                  <X size={11} />
                </button>
              </span>
              <select
                value={img.label}
                onChange={(e) =>
                  setBranding((prev) =>
                    prev.map((b, j) => (j === i ? { ...b, label: e.target.value as BrandingImage["label"] } : b))
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none"
              >
                <option>Logo</option>
                <option>Storefront</option>
                <option>Product/Work</option>
                <option>Other</option>
              </select>
            </span>
          ))}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              queueBranding(e.target.files, "Logo");
              e.target.value = "";
            }}
          />
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              queueBranding(e.target.files, "Other");
              e.target.value = "";
            }}
          />
        </div>

        {/* ---- linked accounts (Google Ads wizard, page 2) ---- */}
        <label className={labelClass}>
          <span className="flex items-center gap-1.5">
            <Link2 size={14} className="text-emerald-600" /> Linked accounts{" "}
            <span className="font-normal text-slate-400">(optional — helps your Google ads)</span>
          </span>
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Google shows richer ads when these are connected. Skip anything you don&apos;t have.
        </p>
        <div className="mt-2 space-y-2.5">
          <input
            type="text"
            value={linked.gbp ?? ""}
            onChange={(e) => setLinked((prev) => ({ ...prev, gbp: e.target.value }))}
            placeholder="Google Business Profile link (your listing on Google Maps)"
            aria-label="Google Business Profile link"
            className={inputClass}
          />
          <input
            type="text"
            value={linked.youtube ?? ""}
            onChange={(e) => setLinked((prev) => ({ ...prev, youtube: e.target.value }))}
            placeholder="YouTube channel or video link"
            aria-label="YouTube channel or video link"
            className={inputClass}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              type="tel"
              value={linked.phone ?? ""}
              onChange={(e) => setLinked((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone for ads (if different)"
              aria-label="Phone number for ads"
              className={inputClass}
            />
            <input
              type="text"
              value={linked.appUrl ?? ""}
              onChange={(e) => setLinked((prev) => ({ ...prev, appUrl: e.target.value }))}
              placeholder="Mobile app link (if you have one)"
              aria-label="Mobile app link"
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || deleting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {editing ? "Save changes" : "Add business"}
        </button>

        {editing && canDelete && (
          <button
            type="button"
            disabled={deleting || saving}
            onClick={handleDelete}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
            Delete this business and its campaigns
          </button>
        )}
      </form>

      {cropQueue.length > 0 && (
        <ImageCropModal
          key={`${cropQueue[0].file.name}-${cropQueue.length}`}
          file={cropQueue[0].file}
          presets={BRAND_CROP}
          title={cropQueue[0].label === "Logo" ? "Crop your logo (square)" : "Crop to square"}
          onDone={(dataUrl) => void uploadCropped(dataUrl, cropQueue[0].label)}
          onCancel={() => setCropQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  );
}
