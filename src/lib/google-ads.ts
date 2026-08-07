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

// Google sunsets each major version ~a year after release (v20 died Jun 2026).
// When every call suddenly 400s, bump GOOGLE_ADS_API_VERSION in Vercel first.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v23";
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
    throw new Error(`Google Ads API ${res.status}: ${detail.slice(0, 1200)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// OAuth connect flow — lets Owen mint the refresh token from his own site
// (/api/google/connect) instead of wrestling with developer tools.
// ---------------------------------------------------------------------------

export function oauthClientConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_OAUTH_CLIENT_ID && process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET
  );
}

export function buildConsentUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_OAUTH_CLIENT_ID as string,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline", // we need a refresh token, not a one-hour pass
    prompt: "consent", // force Google to issue a fresh refresh token every time
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Trades the one-time consent code for tokens. Returns the refresh token. */
export async function exchangeCodeForRefreshToken(
  code: string,
  redirectUri: string
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_OAUTH_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET as string,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange ${res.status}: ${(await res.text()).slice(0, 1200)}`);
  }
  const data = (await res.json()) as { refresh_token?: string };
  return data.refresh_token ?? null;
}

/** Sanity check: which Google Ads accounts can this token actually see? */
export async function listAccessibleCustomers(): Promise<string[]> {
  const token = await accessToken();
  const res = await fetch(`${BASE}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
    },
  });
  if (!res.ok) {
    throw new Error(`listAccessibleCustomers ${res.status}: ${(await res.text()).slice(0, 1200)}`);
  }
  const data = (await res.json()) as { resourceNames?: string[] };
  return (data.resourceNames ?? []).map((r) => r.replace("customers/", ""));
}

// ---------------------------------------------------------------------------
// Publishing — one atomic googleAds:mutate builds the whole Performance Max
// campaign (budget → campaign → criteria → assets → asset group → signals).
// Atomic on purpose: it either ALL lands on Google or none of it does.
// ---------------------------------------------------------------------------

/** What a plan still needs before Google will accept it. Empty = ready. */
export function publishGaps(g: GoogleAdsCampaignPlan): string[] {
  const gaps: string[] = [];
  if (g.headlines.length < 3) gaps.push("at least 3 short headlines");
  if (g.longHeadlines.length < 1) gaps.push("a long headline");
  if (g.descriptions.length < 2) gaps.push("at least 2 descriptions");
  if (!g.businessNameShort) gaps.push("a business name (25 chars)");
  if (!g.landingPageUrl) gaps.push("a landing page URL");
  if (g.imageUrls.landscape.length < 1) gaps.push("a landscape ad image (1200×628)");
  if (g.imageUrls.square.length < 1) gaps.push("a square ad image (1200×1200)");
  if (!g.squareLogoUrl) gaps.push("a square logo in the business profile");
  return gaps;
}

/** Downloads an image (https or data: URL) as base64 for Google's ImageAsset. */
async function imageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) {
      const comma = url.indexOf(",");
      if (comma === -1) return null;
      return url.slice(comma + 1);
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) return null; // Google's 5MB cap
    return Buffer.from(buf).toString("base64");
  } catch {
    return null;
  }
}

/** "youtube.com/watch?v=ID" or "youtu.be/ID" → ID (channel links: null). */
function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] ?? null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
    return shorts ? shorts[1] : null;
  } catch {
    return null;
  }
}

export interface PublishResult {
  campaignId: string;
  campaignResourceName: string;
  /** Non-fatal things we skipped (an image that wouldn't download, etc.). */
  warnings: string[];
}

/**
 * Creates the complete PMax campaign on Google — PAUSED, so nothing spends
 * until it's deliberately switched on. Throws with Google's error text on
 * rejection (the whole batch rolls back).
 */
export async function publishCampaignToGoogle(
  customerId: string,
  campaignName: string,
  zip: string,
  radiusMiles: number,
  g: GoogleAdsCampaignPlan
): Promise<PublishResult> {
  const gaps = publishGaps(g);
  if (gaps.length > 0) {
    throw new Error(`This campaign still needs: ${gaps.join(", ")}.`);
  }

  const cid = customerId.replace(/-/g, "");
  const warnings: string[] = [];
  const ops: Array<Record<string, unknown>> = [];
  let tempId = -1;
  const nextTemp = () => tempId--;

  // 1) Budget
  const budgetRes = `customers/${cid}/campaignBudgets/${nextTemp()}`;
  ops.push({
    campaignBudgetOperation: {
      create: {
        resourceName: budgetRes,
        name: `${campaignName} budget`.slice(0, 250),
        amountMicros: String(Math.round(g.dailyBudget * 1_000_000)),
        deliveryMethod: "STANDARD",
        explicitlyShared: false,
      },
    },
  });

  // 2) Campaign — PAUSED until someone turns the key
  const campaignRes = `customers/${cid}/campaigns/${nextTemp()}`;
  const bidding =
    g.bidStrategy === "maximize_conversion_value"
      ? { maximizeConversionValue: {} }
      : {
          maximizeConversions: g.targetCpa
            ? { targetCpaMicros: String(Math.round(g.targetCpa * 1_000_000)) }
            : {},
        };
  ops.push({
    campaignOperation: {
      create: {
        resourceName: campaignRes,
        name: campaignName.slice(0, 250),
        advertisingChannelType: "PERFORMANCE_MAX",
        status: "PAUSED",
        campaignBudget: budgetRes,
        ...bidding,
      },
    },
  });

  // 3) Where + language
  if (zip.trim()) {
    ops.push({
      campaignCriterionOperation: {
        create: {
          campaign: campaignRes,
          proximity: {
            radius: radiusMiles,
            radiusUnits: "MILES",
            address: { postalCode: zip.trim(), countryCode: "US" },
          },
        },
      },
    });
  } else {
    warnings.push("No ZIP on the campaign — Google will default to nationwide until one is set.");
  }
  ops.push({
    campaignCriterionOperation: {
      create: { campaign: campaignRes, language: { languageConstant: "languageConstants/1000" } },
    },
  });

  // 4) Assets (text, images, logo, CTA, video)
  const assetRes = () => `customers/${cid}/assets/${nextTemp()}`;
  const links: Array<{ asset: string; fieldType: string }> = [];

  const textAsset = (text: string, fieldType: string) => {
    const res = assetRes();
    ops.push({ assetOperation: { create: { resourceName: res, textAsset: { text } } } });
    links.push({ asset: res, fieldType });
  };
  g.headlines.forEach((h) => textAsset(h, "HEADLINE"));
  g.longHeadlines.forEach((h) => textAsset(h, "LONG_HEADLINE"));
  g.descriptions.forEach((d) => textAsset(d, "DESCRIPTION"));
  textAsset(g.businessNameShort, "BUSINESS_NAME");

  const imageAsset = async (url: string, fieldType: string, label: string): Promise<boolean> => {
    const data = await imageAsBase64(url);
    if (!data) {
      warnings.push(`Couldn't load the ${label} image — skipped it.`);
      return false;
    }
    const res = assetRes();
    ops.push({
      assetOperation: {
        create: { resourceName: res, name: `${label} ${Math.abs(tempId)}`, imageAsset: { data } },
      },
    });
    links.push({ asset: res, fieldType });
    return true;
  };
  let haveLandscape = false;
  for (const url of g.imageUrls.landscape.slice(0, 5)) {
    haveLandscape = (await imageAsset(url, "MARKETING_IMAGE", "landscape")) || haveLandscape;
  }
  let haveSquare = false;
  for (const url of g.imageUrls.square.slice(0, 5)) {
    haveSquare = (await imageAsset(url, "SQUARE_MARKETING_IMAGE", "square")) || haveSquare;
  }
  const haveLogo = g.squareLogoUrl ? await imageAsset(g.squareLogoUrl, "LOGO", "logo") : false;
  if (!haveLandscape || !haveSquare || !haveLogo) {
    throw new Error(
      "Google requires a landscape image, a square image, and a logo — one of them couldn't be downloaded. " +
        warnings.join(" ")
    );
  }

  const ctaRes = assetRes();
  ops.push({
    assetOperation: {
      create: { resourceName: ctaRes, callToActionAsset: { callToAction: g.callToAction } },
    },
  });
  links.push({ asset: ctaRes, fieldType: "CALL_TO_ACTION_SELECTION" });

  for (const videoUrl of g.videoUrls.slice(0, 3)) {
    const id = youtubeVideoId(videoUrl);
    if (!id) {
      warnings.push("The linked YouTube URL isn't a single video, so it was skipped (channel links can't be attached).");
      continue;
    }
    const res = assetRes();
    ops.push({
      assetOperation: {
        create: { resourceName: res, youtubeVideoAsset: { youtubeVideoId: id } },
      },
    });
    links.push({ asset: res, fieldType: "YOUTUBE_VIDEO" });
  }

  // 5) Asset group + links + search-theme signals
  const groupRes = `customers/${cid}/assetGroups/${nextTemp()}`;
  ops.push({
    assetGroupOperation: {
      create: {
        resourceName: groupRes,
        campaign: campaignRes,
        name: `${campaignName} assets`.slice(0, 250),
        finalUrls: [g.landingPageUrl],
        status: "ENABLED",
      },
    },
  });
  for (const link of links) {
    ops.push({
      assetGroupAssetOperation: {
        create: { assetGroup: groupRes, asset: link.asset, fieldType: link.fieldType },
      },
    });
  }
  for (const theme of g.searchThemes.slice(0, 25)) {
    ops.push({
      assetGroupSignalOperation: {
        create: { assetGroup: groupRes, searchTheme: { text: theme } },
      },
    });
  }

  // 6) Sitelinks hang off the campaign
  for (const sitelink of g.sitelinks.slice(0, 10)) {
    const res = assetRes();
    ops.push({
      assetOperation: {
        create: {
          resourceName: res,
          finalUrls: [sitelink.url],
          sitelinkAsset: { linkText: sitelink.text.slice(0, 25) },
        },
      },
    });
    ops.push({
      campaignAssetOperation: {
        create: { campaign: campaignRes, asset: res, fieldType: "SITELINK" },
      },
    });
  }

  const reply = (await googleAdsRequest(cid, "/googleAds:mutate", {
    mutateOperations: ops,
  })) as { mutateOperationResponses?: Array<Record<string, { resourceName?: string }>> };

  const created =
    reply.mutateOperationResponses
      ?.map((r) => r.campaignResult?.resourceName)
      .find(Boolean) ?? null;
  if (!created) throw new Error("Google accepted the request but returned no campaign id.");
  const campaignId = created.split("/").pop() as string;
  return { campaignId, campaignResourceName: created, warnings };
}

/** Flips a published campaign's status (ENABLED / PAUSED / REMOVED). */
export async function setGoogleCampaignStatus(
  customerId: string,
  campaignResourceName: string,
  status: "ENABLED" | "PAUSED" | "REMOVED"
): Promise<void> {
  await googleAdsRequest(customerId.replace(/-/g, ""), "/campaigns:mutate", {
    operations: [
      { update: { resourceName: campaignResourceName, status }, updateMask: "status" },
    ],
  });
}

/**
 * STILL TO BUILD (next sessions):
 *  - syncStatuses + fetchDailyMetrics via googleAds:searchStream GAQL, feeding
 *    real numbers into the dashboard in place of lib/metrics.ts fakes
 *  - wire pause/resume/end buttons through setGoogleCampaignStatus once a
 *    campaign has googleCampaignId
 *  - production switch: swap GOOGLE_ADS_TEST_CUSTOMER_ID for per-customer
 *    accounts after Basic-access approval
 */
