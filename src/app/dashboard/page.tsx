import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CampaignBuilder from "@/components/dashboard/CampaignBuilder";
import CampaignList from "@/components/dashboard/CampaignList";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { listCampaignsByUser } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard — AdPilot" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const campaigns = await listCampaignsByUser(user.id);
  const displayName = user.businessName || user.email.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:block">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-navy-300 hover:text-navy-900"
              >
                <LogOut size={15} />
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">
          Welcome, {displayName}
        </h1>
        <p className="mt-1.5 text-lg text-slate-600">
          Three controls and one button — your smart helper does the rest.
        </p>

        <div className="mt-8">
          <CampaignBuilder />
        </div>

        <div className="mt-12">
          <CampaignList campaigns={campaigns} />
        </div>
      </main>
    </div>
  );
}
