"use client";

import {
  BarChart3,
  Building2,
  ChevronDown,
  History,
  Loader2,
  LogOut,
  Megaphone,
  Plus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ActiveCampaigns from "./ActiveCampaigns";
import AnalyticsPanel from "./AnalyticsPanel";
import CampaignModal from "./CampaignModal";
import HistoryTable from "./HistoryTable";
import Logo from "@/components/Logo";
import { DRAFT_STORAGE_KEY } from "@/components/landing/HeroConfigurator";
import { aggregateMetrics, metricsForCampaign } from "@/lib/metrics";
import type { Business, Campaign, CampaignDraft, SafeUser } from "@/lib/types";

type Tab = "campaigns" | "analytics" | "history";

const TABS: Array<{ key: Tab; label: string; icon: typeof Megaphone }> = [
  { key: "campaigns", label: "Active Campaigns", icon: Megaphone },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "history", label: "Past Ad Buys", icon: History },
];

const CATEGORIES = [
  "Home Services",
  "Retail/Boutique",
  "Fitness/Gym",
  "Professional Services",
  "Other",
];

export default function DashboardShell({
  user,
  businesses,
  campaigns,
}: {
  user: SafeUser;
  businesses: Business[];
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);

  // add-business modal state
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState(CATEGORIES[1]);
  const [bizSaving, setBizSaving] = useState(false);

  // Pick up the campaign the visitor configured on the landing page.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        const parsed = JSON.parse(raw) as CampaignDraft;
        if (parsed && typeof parsed.intentText === "string") {
          setDraft(parsed);
          setCampaignModalOpen(true);
        }
      }
    } catch {
      // localStorage unavailable — nothing to restore.
    }
  }, []);

  const selectedBusiness = businesses.find((b) => b.id === selectedId) ?? businesses[0];
  const businessCampaigns = useMemo(
    () => campaigns.filter((c) => c.businessId === selectedBusiness?.id),
    [campaigns, selectedBusiness?.id]
  );
  const metrics = useMemo(
    () => aggregateMetrics(businessCampaigns.map(metricsForCampaign)),
    [businessCampaigns]
  );

  async function handleAddBusiness(e: React.FormEvent) {
    e.preventDefault();
    setBizSaving(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bizName, category: bizCategory }),
      });
      const data = (await res.json()) as { business?: Business };
      if (res.ok && data.business) {
        setSelectedId(data.business.id);
        setBizModalOpen(false);
        setBizName("");
        router.refresh();
      }
    } finally {
      setBizSaving(false);
    }
  }

  const firstName = user.fullName.split(" ")[0] || user.fullName;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo href="/dashboard" />

          {/* business selector */}
          <div className="relative ml-2 sm:ml-6">
            <Building2
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
            />
            <select
              value={selectedBusiness?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Switch business"
              className="max-w-[160px] cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-navy-900 outline-none transition hover:border-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:max-w-[240px]"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setBizModalOpen(true)}
            className="hidden items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700 sm:flex"
          >
            <Plus size={14} />
            Add New Business
          </button>

          <div className="ml-auto flex items-center gap-3">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">
              Welcome back, {user.fullName}
            </h1>
            <p className="mt-1.5 text-lg text-slate-600">
              Here&apos;s how {selectedBusiness?.name ?? "your business"} is doing, {firstName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCampaignModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            <Plus size={16} />
            Create New Campaign
          </button>
        </div>

        {/* mobile add-business */}
        <button
          type="button"
          onClick={() => setBizModalOpen(true)}
          className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-700 sm:hidden"
        >
          <Plus size={14} />
          Add New Business
        </button>

        {/* tabs */}
        <div className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-card">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === key ? "bg-navy-900 text-white shadow-card" : "text-slate-500 hover:text-navy-900"
              }`}
            >
              <Icon size={15} className={tab === key ? "text-emerald-400" : ""} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "campaigns" && (
            <ActiveCampaigns campaigns={businessCampaigns} onCreate={() => setCampaignModalOpen(true)} />
          )}
          {tab === "analytics" && <AnalyticsPanel metrics={metrics} />}
          {tab === "history" && <HistoryTable campaigns={businessCampaigns} />}
        </div>
      </main>

      {/* modals */}
      {campaignModalOpen && selectedBusiness && (
        <CampaignModal
          businessId={selectedBusiness.id}
          businessName={selectedBusiness.name}
          initialDraft={draft}
          onClose={() => {
            setCampaignModalOpen(false);
            setDraft(null);
          }}
          onLaunched={() => router.refresh()}
        />
      )}

      {bizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddBusiness}
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">Add a new business</h2>
              <button
                type="button"
                onClick={() => setBizModalOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Run campaigns for another shop, location, or venture — all under one login.
            </p>
            <label className="mt-5 block text-sm font-semibold text-navy-900" htmlFor="biz-name">
              Business name
            </label>
            <input
              id="biz-name"
              type="text"
              required
              minLength={2}
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              placeholder="e.g., Main St. Bakery — Downtown"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <label className="mt-4 block text-sm font-semibold text-navy-900" htmlFor="biz-category">
              Category
            </label>
            <select
              id="biz-category"
              value={bizCategory}
              onChange={(e) => setBizCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[15px] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={bizSaving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {bizSaving && <Loader2 size={16} className="animate-spin" />}
              Add business
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
