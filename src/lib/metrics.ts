/**
 * Deterministic performance-metrics engine.
 *
 * Real ad-platform numbers arrive via the Google/Meta/Reddit reporting APIs;
 * until those are connected, this generates realistic, *stable* metrics —
 * the same campaign always produces the same numbers (seeded by campaign id),
 * so the dashboard feels like a system of record rather than a slot machine.
 */
import type { Campaign } from "./types";

export interface DayPoint {
  date: string; // ISO date (yyyy-mm-dd)
  label: string; // e.g. "Jun 12"
  impressions: number;
  clicks: number;
}

export interface Metrics {
  impressions: number;
  clicks: number;
  ctr: number; // percent
  avgCpc: number; // dollars
  conversions: number;
  costPerAcquisition: number; // dollars
  spent: number; // dollars
  series: DayPoint[];
}

// ---- seeded randomness -----------------------------------------------------

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- core ------------------------------------------------------------------

const DAYS = 30;
const MS_PER_DAY = 86_400_000;

/** Fraction of the campaign's monthly budget delivered so far (0..1). */
export function budgetProgress(campaign: Campaign): number {
  if (campaign.status === "completed") return 1;
  const elapsedDays = (Date.now() - new Date(campaign.startDate).getTime()) / MS_PER_DAY;
  const cycleDays = campaign.continuous ? 30 : campaign.durationMonths * 30;
  return Math.max(0.04, Math.min(1, elapsedDays / cycleDays));
}

export function metricsForCampaign(campaign: Campaign): Metrics {
  const rand = mulberry32(hashString(campaign.id));

  // Personality of this campaign (stable): CPM, CTR, conversion rate.
  const impressionsPerDollar = 35 + rand() * 25; // 35–60
  const ctrRate = 0.015 + rand() * 0.02; // 1.5%–3.5%
  const convRate = 0.04 + rand() * 0.05; // 4%–9%

  const monthsRun = campaign.status === "completed" ? campaign.durationMonths : 1;
  const spent = Math.round(campaign.budget * monthsRun * budgetProgress(campaign));

  const totalImpressionsTarget = spent * impressionsPerDollar;

  // Build a 30-day daily series with a weekly rhythm plus noise.
  const series: DayPoint[] = [];
  const today = new Date();
  const weights: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    const wave = 1 + 0.25 * Math.sin((i / 7) * Math.PI * 2);
    weights.push(wave * (0.7 + rand() * 0.6));
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);

  let impressions = 0;
  let clicks = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today.getTime() - (DAYS - 1 - i) * MS_PER_DAY);
    const dayImpressions = Math.round((totalImpressionsTarget * weights[i]) / weightSum);
    const dayClicks = Math.round(dayImpressions * ctrRate * (0.8 + rand() * 0.4));
    impressions += dayImpressions;
    clicks += dayClicks;
    series.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      impressions: dayImpressions,
      clicks: dayClicks,
    });
  }

  const conversions = Math.max(1, Math.round(clicks * convRate));
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    avgCpc: clicks > 0 ? spent / clicks : 0,
    conversions,
    costPerAcquisition: conversions > 0 ? spent / conversions : 0,
    spent,
    series,
  };
}

/** Combine several campaigns' metrics into one business-level view. */
export function aggregateMetrics(all: Metrics[]): Metrics {
  if (all.length === 0) {
    const today = new Date();
    const series: DayPoint[] = [];
    for (let i = 0; i < DAYS; i++) {
      const date = new Date(today.getTime() - (DAYS - 1 - i) * MS_PER_DAY);
      series.push({
        date: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        impressions: 0,
        clicks: 0,
      });
    }
    return { impressions: 0, clicks: 0, ctr: 0, avgCpc: 0, conversions: 0, costPerAcquisition: 0, spent: 0, series };
  }

  const series: DayPoint[] = all[0].series.map((point, i) => ({
    date: point.date,
    label: point.label,
    impressions: all.reduce((sum, m) => sum + (m.series[i]?.impressions ?? 0), 0),
    clicks: all.reduce((sum, m) => sum + (m.series[i]?.clicks ?? 0), 0),
  }));

  const impressions = all.reduce((s, m) => s + m.impressions, 0);
  const clicks = all.reduce((s, m) => s + m.clicks, 0);
  const conversions = all.reduce((s, m) => s + m.conversions, 0);
  const spent = all.reduce((s, m) => s + m.spent, 0);

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    avgCpc: clicks > 0 ? spent / clicks : 0,
    conversions,
    costPerAcquisition: conversions > 0 ? spent / conversions : 0,
    spent,
    series,
  };
}

/** Plain-English result line for the history table. */
export function outcomeSummary(metrics: Metrics): string {
  return `Successful: ${metrics.clicks.toLocaleString()} visitors and ${metrics.conversions.toLocaleString()} new leads generated`;
}
