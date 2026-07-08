import { CalendarDays, Inbox, MapPin } from "lucide-react";
import type { Campaign, Platform, PlatformStatus } from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  google: "Google",
  meta: "Instagram",
  reddit: "Reddit",
};

const STATUS_STYLES: Record<PlatformStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  in_review: { label: "In review", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  live: { label: "Live", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  paused: { label: "Paused", className: "bg-slate-100 text-slate-500 ring-slate-200" },
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight text-navy-900">Your campaigns</h2>
      {campaigns.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Inbox size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-600">Nothing here yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Your first campaign will show up here the moment you hit Launch Everywhere.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-navy-900">
                    {campaign.adCopyJson.headlines[0] ?? "Campaign"}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="font-semibold text-emerald-700">
                      {money(campaign.budget)}/month
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {campaign.targetingJson.radiusMiles} mile radius
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} />
                      {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => {
                    const status = STATUS_STYLES[campaign.platformStatuses[platform]];
                    return (
                      <span
                        key={platform}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                      >
                        {PLATFORM_LABELS[platform]}: {status.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
