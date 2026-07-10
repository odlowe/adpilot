import { NextResponse } from "next/server";
import { listBusinessesByUser, listCampaignsByUser, listUsers } from "@/lib/db";
import { sendCampaignDigest } from "@/lib/email";
import { aggregateMetrics, metricsForCampaign } from "@/lib/metrics";

/**
 * The digest alarm clock. Vercel Cron hits this daily (see vercel.json);
 * each user gets their report on their chosen cadence:
 *   daily → every run, weekly → Mondays, monthly → the 1st.
 *
 * Locked down: requires the CRON_SECRET env var, which Vercel automatically
 * sends as "Authorization: Bearer <CRON_SECRET>" on scheduled runs. Anyone
 * else hitting this URL gets a 401 instead of triggering mass email.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const isFirstOfMonth = now.getUTCDate() === 1;

  let sent = 0;
  const users = await listUsers();

  for (const user of users) {
    const prefs = user.emailPrefs;
    if (!prefs?.enabled) continue;

    const due =
      prefs.digestFrequency === "daily" ||
      (prefs.digestFrequency === "weekly" && isMonday) ||
      (prefs.digestFrequency === "monthly" && isFirstOfMonth);
    if (!due) continue;

    const periodLabel =
      prefs.digestFrequency === "daily"
        ? "today"
        : prefs.digestFrequency === "weekly"
          ? "this week"
          : "this month";

    const [businesses, campaigns] = await Promise.all([
      listBusinessesByUser(user.id),
      listCampaignsByUser(user.id),
    ]);

    for (const business of businesses) {
      const businessCampaigns = campaigns.filter((c) => c.businessId === business.id);
      if (businessCampaigns.length === 0) continue;
      const metrics = aggregateMetrics(businessCampaigns.map(metricsForCampaign));
      await sendCampaignDigest({
        dashboardUrl: `${new URL(request.url).origin}/dashboard`,
        to: user.email,
        businessName: business.name,
        periodLabel,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        spent: metrics.spent,
      });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, digestsSent: sent });
}
