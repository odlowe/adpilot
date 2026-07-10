import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth";
import { listBusinessesByUser, listCampaignsByUser } from "@/lib/db";

export const metadata: Metadata = { title: `Dashboard — ${BRAND.name}` };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [businesses, campaigns] = await Promise.all([
    listBusinessesByUser(user.id),
    listCampaignsByUser(user.id),
  ]);

  if (businesses.length === 0) redirect("/onboarding");

  return <DashboardShell user={user} businesses={businesses} campaigns={campaigns} />;
}
