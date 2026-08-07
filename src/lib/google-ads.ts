/**
 * Google Ads adapter — THE FOUNDATION for real campaign publishing.
 * Raw REST (no SDK), matching the project convention.
 *
 * ── Credentials (all three required before any call works) ──────────────────
 *   GOOGLE_ADS_DEVELOPER_TOKEN   Owen's token (test-access level: works
 *                                against Google Ads TEST accounts only).
 *   GOOGLE_ADS_OAUTH_CLIENT_ID / GOOGLE_ADS_OAUTH_CLIENT_SECRET
 *                                From a Google Cloud project (APIs &
 *                                Services → Credentials → OAuth client).
 *   GOOGLE_ADS_REFRESH_TOKEN     Obtained once via the OAuth consent flow
 *                                for the manager account.
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID The 10-digit manager (MCC) account id.
 *   GOOGLE_ADS_API_VERSION       default below — bump when Google deprecates.
 *
 * The shape here mirrors a Performance Max campaign, which is what the
 * 9-page wizard (see HANDOFF blueprint) collects.
 */

import type {
  AdCopy,
  Business,
  CampaignCreative,
  CampaignGoal,
  GoogleAdsCampaignPlan,
  PmaxAssets,
  Targeting,
} from "./types";

// The plan shape now lives in types.ts (it's stored on Campaign.googleAdsJson);
// re-exported here so google-ads-centric code can keep importing it from this file.
export type { GoogleAdsCampaignPlan } from "./types";

const API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v20";
const BASE = `https://googleads.googleapis.com/${API_VERSION}`;

export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

// ---------------------------------------------------------------------------
// Asset hygiene — Google's char limits are hard rules, so they're enforced in
// code here (shared by the AI planner, the API routes, and the preview editor).
// ---------------------------------------------------------------------------

/** Clip to a char budget at a word boundary, dropping trailing punctuation. */
export function clipAsset(value: string, max: number): string {
  const s = value.trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  let clipped = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : s.slice(0, max)).trim();
  clipped = clipped.replace(/[,;:\-–—&/]+$/, "").trim();
  // Don't end on a dangling word ("Your new favorite The") — trim it off.
  clipped = clipped.replace(
    /\s+(the|a|an|of|for|to|and|or|with|your|our|is|in|on|at|by)[.!?]*$/i,
    ""
  );
  return clipped.replace(/[,;:\-–—&/]+$/, "").trim();
}

function cleanList(value: unknown, maxChars: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const s = clipAsset(item, maxChars);
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** Validates an untyped pmax blob (from the AI or the preview editor) into safe assets. */
export function sanitizePmax(raw: unknown): PmaxAssets | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const assets: PmaxAssets = {
    searchThemes: cleanList(o.searchThemes, 80, 12),
    productTerms: cleanList(o.productTerms, 60, 8),
    uniqueSellingPoints: cleanList(o.uniqueSellingPoints, 90, 6),
    headlines: cleanList(o.headlines, 30, 15),
    longHeadlines: cleanList(o.longHeadlines, 90, 5),
    descriptions: cleanList(o.descriptions, 90, 5),
    businessNameShort:
      typeof o.businessNameShort === "string" ? clipAsset(o.businessNameShort, 25) : "",
  };
  // Not usable as an asset group without the core text assets.
  if (assets.headlines.length < 3 || assets.descriptions.length < 2) return null;
  return assets;
}

/**
 * Derives a complete PMax asset group from the classic ad copy + targeting —
 * the safety net when the AI reply skips or flubs the pmax block, and the
 * generator for the built-in (no-API-key) planner.
 */
export function buildPmaxFromBasics(
  adCopy: AdCopy,
  targeting: Targeting,
  businessName: string
): PmaxAssets {
  const headlines = cleanList(
    [
      businessName,
      ...adCopy.headlines,
      ...targeting.googleKeywords.map((k) =>
        k.replace(/\s*near me\s*/gi, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase())
      ),
      "Locally Owned & Trusted",
      "Right Around The Corner",
    ],
    30,
    15
  );
  const longHeadlines = cleanList(
    [...adCopy.headlines, targeting.audienceSummary],
    90,
    5
  );
  const descriptions = cleanList(
    [...adCopy.descriptions, targeting.audienceSummary],
    90,
    5
  );
  const productTerms = cleanList(
    targeting.googleKeywords.map((k) =>
      k.replace(/\s*(near me|open now|nearby)\s*/gi, " ").trim()
    ),
    60,
    8
  );
  return {
    searchThemes: cleanList(targeting.googleKeywords, 80, 12),
    productTerms,
    uniqueSellingPoints: cleanList(
      adCopy.descriptions.flatMap((d) => d.split(/(?<=[.!])\s+/)),
      90,
      5
    ),
    headlines,
    longHeadlines,
    descriptions,
    businessNameShort: clipAsset(businessName, 25),
  };
}

/** Guarantees the legally required political disclaimer survives into the copy. */
export function ensurePaidForBy(assets: PmaxAssets, paidForBy: string): PmaxAssets {
  const line = clipAsset(`Paid for by ${paidForBy.replace(/^paid for by\s*/i, "")}`, 90);
  const has = assets.descriptions.some((d) => /paid for by/i.test(d));
  if (has) return assets;
  const descriptions =
    assets.descriptions.length >= 5
      ? [...assets.descriptions.slice(0, 4), line]
      : [...assets.descriptions, line];
  return { ...assets, descriptions };
}

const GOAL_CTA: Record<CampaignGoal, GoogleAdsCampaignPlan["callToAction"]> = {
  purchases: "SHOP_NOW",
  leads_form: "SIGN_UP",
  leads_calls: "CONTACT_US",
  page_views: "LEARN_MORE",
  brand_awareness: "LEARN_MORE",
};

/** "/about-us" → "About Us" — friendly sitelink text from a URL (≤25 chars). */
function sitelinkTextFrom(url: string): string {
  try {
    const path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
    const segment = path.split("/").filter(Boolean).pop() ?? "";
    const words = segment.replace(/[-_]+/g, " ").replace(/\.\w+$/, "").trim();
    if (!words) return "Learn More";
    return clipAsset(words.replace(/\b\w/g, (c) => c.toUpperCase()), 25) || "Learn More";
  } catch {
    return "Learn More";
  }
}

function normalizeUrl(url: string): string {
  const s = url.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** What the wizard hands over at launch — everything else is derived. */
export interface BuildGoogleAdsPlanInput {
  goal: CampaignGoal;
  landingPageUrl: string;
  enhancePageUrls: string[];
  bidStrategy: GoogleAdsCampaignPlan["bidStrategy"];
  targetCpa?: number;
  monthlyBudget: number;
  zip: string;
  radiusMiles: number;
  pmax: PmaxAssets;
  business: Pick<Business, "name" | "website" | "brandingJson" | "linkedAccountsJson">;
  creatives: CampaignCreative[];
  paidForBy?: string | null;
}

/**
 * Assembles the complete Performance Max plan from the wizard's answers, the
 * AI asset group, and the business profile. Stored on Campaign.googleAdsJson
 * at launch — the exact payload the API adapter below will publish.
 */
export function buildGoogleAdsPlan(input: BuildGoogleAdsPlanInput): GoogleAdsCampaignPlan {
  const paidForBy = input.paidForBy?.trim() || null;
  const pmax = paidForBy ? ensurePaidForBy(input.pmax, paidForBy) : input.pmax;

  const landscape = input.creatives
    .filter((c) => c.format === "landscape" || c.format === "banner" || c.format === "custom")
    .map((c) => c.url);
  const square = input.creatives.filter((c) => c.format === "square").map((c) => c.url);
  const logo = input.business.brandingJson.find((b) => b.label === "Logo")?.url ?? null;
  const youtube = input.business.linkedAccountsJson?.youtube?.trim();

  const enhancePageUrls = input.enhancePageUrls
    .map(normalizeUrl)
    .filter(Boolean)
    .slice(0, 10);

  return {
    goal: input.goal,
    searchThemes: pmax.searchThemes,
    locations: [
      `${input.radiusMiles} miles around ${input.zip.trim() || "the business address"}`,
    ],
    languageCode: "en",
    landingPageUrl:
      normalizeUrl(input.landingPageUrl) || normalizeUrl(input.business.website) || "",
    productTerms: pmax.productTerms,
    uniqueSellingPoints: pmax.uniqueSellingPoints,
    enhancePageUrls,
    headlines: pmax.headlines,
    longHeadlines: pmax.longHeadlines,
    descriptions: pmax.descriptions,
    imageUrls: { landscape, square },
    squareLogoUrl: logo,
    businessNameShort: pmax.businessNameShort || clipAsset(input.business.name, 25),
    videoUrls: youtube ? [youtube] : [],
    sitelinks: enhancePageUrls.map((url) => ({ text: sitelinkTextFrom(url), url })),
    callToAction: GOAL_CTA[input.goal],
    bidStrategy: input.bidStrategy,
    ...(input.targetCpa && input.targetCpa > 0
      ? { targetCpa: Math.round(input.targetCpa * 100) / 100 }
      : {}),
    dailyBudget: Math.round((input.monthlyBudget / 30.4) * 100) / 100,
    paidForBy,
  };
}

/** Fetches a fresh OAuth access token from the stored refresh token. */
async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_OAUTH_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET as string,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth reply missing access_token");
  return data.access_token;
}

/** Authenticated call helper for the Google Ads REST API. */
export async function googleAdsRequest(
  customerId: string,
  path: string,
  body: unknown
): Promise<unknown> {
  const token = await accessToken();
  const res = await fetch(`${BASE}/customers/${customerId}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
      ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
        ? { "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "") }
        : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Ads API ${res.status}: ${detail.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * NEXT SESSION IMPLEMENTS (in order, each testable against the test account):
 *  1. createCampaignBudget(customerId, plan.dailyBudget)
 *  2. createPMaxCampaign(customerId, budgetResourceName, plan) — bidding from
 *     plan.bidStrategy/targetCpa, geo + language criteria from plan.locations
 *  3. createAssetGroup(customerId, campaign, plan) — headlines, descriptions,
 *     images (uploaded as ImageAsset from our stored creative URLs), logo,
 *     videos (YouTube ids), sitelinks, CTA, search themes as signals
 *  4. pause/resume/end → campaign status mutate
 *  5. syncStatuses + fetchDailyMetrics via googleAds:searchStream GAQL
 */
