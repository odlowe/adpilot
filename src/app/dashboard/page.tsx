import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth";
import { listBusinessesByUser, listCampaignsByUser } from "@/lib/db";

export const metadata: Metadata = { title: `Dashboard — ${BRAND.name}` };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { billing?: string; verified?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [businesses, campaigns] = await Promise.all([
    listBusinessesByUser(user.id),
    listCampaignsByUser(user.id),
  ]);

  if (businesses.length === 0) redirect("/onboarding");

  // One-time notices carried back on the URL (Stripe redirect, verify link).
  const notice =
    searchParams?.billing === "success"
      ? ("billing-success" as const)
      : searchParams?.billing === "cancelled"
        ? ("billing-cancelled" as const)
        : searchParams?.verified === "1"
          ? ("verified" as const)
          : searchParams?.verified === "0"
            ? ("verify-failed" as const)
            : null;

  return <DashboardShell user={user} businesses={businesses} campaigns={campaigns} notice={notice} />;
}
