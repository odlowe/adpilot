/**
 * Sample-campaign specs shared by both storage backends. Every new business
 * is seeded with one live and two completed campaigns (flagged `isSample`)
 * so the analytics and history views demonstrate themselves.
 */
import { generateCampaignPlan } from "./ai";
import type { Business, BusinessCategory, Campaign } from "./types";

const SAMPLE_INTENTS: Record<BusinessCategory, string> = {
  "Home Services":
    "We do plumbing and small home repairs, want homeowners nearby who need fast, reliable help",
  "Retail/Boutique":
    "A local boutique shop, want to reach shoppers nearby who love unique, quality finds",
  "Fitness/Gym":
    "A neighborhood fitness studio, want to reach locals who want to get in shape with classes",
  "Professional Services":
    "A trusted local firm, want small business owners and families nearby who need expert help",
  Other:
    "A locally owned business, want to reach neighbors nearby who prefer to shop local",
};

export async function buildSampleCampaigns(
  business: Business
): Promise<Array<Omit<Campaign, "id">>> {
  const intent = SAMPLE_INTENTS[business.category];
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  const specs = [
    {
      name: `${business.name} — Neighborhood awareness`,
      budget: 600,
      radius: 10,
      durationMonths: 2,
      continuous: false,
      status: "completed" as const,
      start: daysAgo(150),
      end: daysAgo(90),
    },
    {
      name: `${business.name} — Spring promotion`,
      budget: 900,
      radius: 15,
      durationMonths: 1,
      continuous: false,
      status: "completed" as const,
      start: daysAgo(75),
      end: daysAgo(45),
    },
    {
      name: `${business.name} — Always-on local reach`,
      budget: 750,
      radius: 12,
      durationMonths: 1,
      continuous: true,
      status: "active" as const,
      start: daysAgo(12),
      end: null,
    },
  ];

  const campaigns: Array<Omit<Campaign, "id">> = [];
  for (const spec of specs) {
    const plan = await generateCampaignPlan(intent, spec.budget, spec.radius);
    campaigns.push({
      userId: business.userId,
      businessId: business.id,
      name: spec.name,
      budget: spec.budget,
      zip: "",
      durationMonths: spec.durationMonths,
      continuous: spec.continuous,
      manualMode: false,
      platformSplit: { google: 34, meta: 33, reddit: 33 },
      siteCategories: [],
      customSites: [],
      creativeUrl: null,
      industryText: intent,
      targetingJson: plan.targeting,
      adCopyJson: plan.adCopy,
      platformStatuses:
        spec.status === "active"
          ? { google: "live", meta: "live", reddit: "live" }
          : { google: "paused", meta: "paused", reddit: "paused" },
      status: spec.status,
      startDate: spec.start,
      endDate: spec.end,
      isSample: true,
      createdAt: spec.start,
    });
  }
  return campaigns;
}
