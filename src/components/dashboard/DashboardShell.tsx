"use client";

import {
  BarChart3,
  Building2,
  ChevronDown,
  History,
  Loader2,
  LogOut,
  Megaphone,
  PauseCircle,
  Pencil,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ActiveCampaigns from "./ActiveCampaigns";
import AnalyticsPanel from "./AnalyticsPanel";
import AnalyticsView from "./AnalyticsView";
import BusinessModal from "./BusinessModal";
import CampaignModal from "./CampaignModal";
import CreativeManagerModal from "./CreativeManagerModal";
import EditCampaignModal from "./EditCampaignModal";
import TimeframePicker from "./TimeframePicker";
import HistoryTable from "./HistoryTable";
import SettingsModal from "./SettingsModal";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/Logo";
import { DRAFT_STORAGE_KEY } from "@/components/landing/HeroConfigurator";
import { metricsForCampaign, windowDaysFor, type Timeframe } from "@/lib/metrics";
import type { Business, Campaign, CampaignDraft, SafeUser } from "@/lib/types";

type Tab = "campaigns" | "analytics" | "history";

const TABS: Array<{ key: Tab; label: string; icon: typeof Megaphone }> = [
  { key: "campaigns", label: "Active Campaigns", icon: Megaphone },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "history", label: "Past Ad Buys", icon: History },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<Campaign | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<Timeframe>("all");
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [creativesFor, setCreativesFor] = useState<Campaign | null>(null);
  /** Campaign waiting on the "editing pauses your ads" confirmation. */
  const [confirmEdit, setConfirmEdit] = useState<Campaign | null>(null);
  const [pausingForEdit, setPausingForEdit] = useState(false);
  /** True when we paused a live campaign to edit it and owe it a resume. */
  const [resumeAfterEdit, setResumeAfterEdit] = useState(false);

  // business modal: "create" or the business being edited
  const [bizModal, setBizModal] = useState<"create" | Business | null>(null);

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

  const firstName = user.fullName.split(" ")[0] || user.fullName;

  /** Pencil clicked: live campaigns need the pause warning first. */
  function requestEdit(campaign: Campaign) {
    if (campaign.status === "active") {
      setConfirmEdit(campaign);
    } else {
      setResumeAfterEdit(false);
      setEditCampaign(campaign);
    }
  }

  /** Owner confirmed: pause the campaign, then open the editor. */
  async function pauseAndEdit() {
    if (!confirmEdit) return;
    setPausingForEdit(true);
    try {
      await fetch(`/api/campaigns/${confirmEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      setResumeAfterEdit(true);
      setEditCampaign(confirmEdit);
      setConfirmEdit(null);
    } finally {
      setPausingForEdit(false);
    }
  }

  /** Editor closed (saved or not): resume the campaign if we paused it. */
  async function closeEdit() {
    const campaign = editCampaign;
    setEditCampaign(null);
    if (campaign && resumeAfterEdit) {
      setResumeAfterEdit(false);
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />

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
          {selectedBusiness && (
            <button
              type="button"
              onClick={() => setBizModal(selectedBusiness)}
              aria-label={`Edit ${selectedBusiness.name}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setBizModal("create")}
            className="hidden items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700 sm:flex"
          >
            <Plus size={14} />
            Add New Business
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Settings</span>
            </button>
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
          onClick={() => setBizModal("create")}
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
            <ActiveCampaigns
              campaigns={businessCampaigns}
              onManageCreatives={setCreativesFor}
              onCreate={() => setCampaignModalOpen(true)}
              onViewAnalytics={setAnalyticsCampaign}
              onEdit={requestEdit}
            />
          )}
          {tab === "analytics" && (
            <AnalyticsView key={selectedBusiness?.id} campaigns={businessCampaigns} />
          )}
          {tab === "history" && (
            <HistoryTable campaigns={businessCampaigns} onViewAnalytics={setAnalyticsCampaign} onManageCreatives={setCreativesFor} />
          )}
        </div>
      </main>

      <Footer />

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

      {settingsOpen && (
        <SettingsModal
          user={user}
          businesses={businesses}
          onEditBusiness={(b) => {
            setSettingsOpen(false);
            setBizModal(b);
          }}
          onAddBusiness={() => {
            setSettingsOpen(false);
            setBizModal("create");
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {analyticsCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-slate-50 shadow-lift">
            <div className="flex items-start justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Campaign analytics</h2>
                <p className="text-sm text-slate-500">
                  {analyticsCampaign.name} — this ad buy only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsCampaign(null)}
                aria-label="Close analytics"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex justify-end">
                <TimeframePicker value={analyticsTimeframe} onChange={setAnalyticsTimeframe} />
              </div>
              <AnalyticsPanel
                metrics={metricsForCampaign(
                  analyticsCampaign,
                  windowDaysFor([analyticsCampaign], analyticsTimeframe)
                )}
              />
            </div>
          </div>
        </div>
      )}

      {confirmEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto mt-16 w-full max-w-md rounded-2xl bg-white p-7 shadow-lift">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <PauseCircle size={20} className="text-amber-600" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy-900">Edit this campaign?</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Editing temporarily pauses{" "}
                  <span className="font-semibold text-navy-900">{confirmEdit.name}</span> so your
                  changes don&apos;t go out half-finished. It resumes automatically the moment
                  you&apos;re done — money already spent stays spent.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pausingForEdit}
                onClick={() => setConfirmEdit(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900 disabled:opacity-60"
              >
                Never mind
              </button>
              <button
                type="button"
                disabled={pausingForEdit}
                onClick={() => void pauseAndEdit()}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {pausingForEdit && <Loader2 size={15} className="animate-spin" />}
                Pause &amp; edit
              </button>
            </div>
          </div>
        </div>
      )}

      {creativesFor && (
        <CreativeManagerModal
          campaign={creativesFor}
          finishLabel={editCampaign ? "Save & back to campaign edits" : "Update campaign"}
          onClose={() => setCreativesFor(null)}
        />
      )}
      {/* Kept mounted (hidden) while the image manager is open, so in-progress
          campaign edits survive the round trip. */}
      {editCampaign && (
        <div className={creativesFor ? "hidden" : ""}>
        <EditCampaignModal
          campaign={editCampaign}
          onManageImages={() => setCreativesFor(editCampaign)}
          onClose={() => void closeEdit()}
        />
        </div>
      )}

      {bizModal && (
        <BusinessModal
          business={bizModal === "create" ? undefined : bizModal}
          canDelete={businesses.length > 1}
          onClose={() => setBizModal(null)}
          onSaved={(businessId) => {
            setBizModal(null);
            if (businessId) {
              setSelectedId(businessId);
            } else {
              // business deleted — fall back to the first remaining one
              const remaining = businesses.filter(
                (b) => bizModal !== "create" && b.id !== bizModal.id
              );
              if (remaining[0]) setSelectedId(remaining[0].id);
            }
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
