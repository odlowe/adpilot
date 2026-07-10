"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { readError } from "@/lib/client";
import type { Business } from "@/lib/types";

const CATEGORIES = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
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
        body: JSON.stringify({ name, category, description, address, phone, website }),
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
    </div>
  );
}
