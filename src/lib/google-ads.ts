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

/** Everything the wizard collects that Google's Performance Max needs. */
export interface GoogleAdsCampaignPlan {
  /** Page 3 — campaign goal. */
  goal: "purchases" | "leads_form" | "leads_calls" | "page_views" | "brand_awareness";
  /** Page 4 — search themes + geo/language. */
  searchThemes: string[]; // words/phrases people search
  locations: string[]; // geo target names or radius spec
  languageCode: string; // e.g. "en"
  /** Page 5 — landing + positioning. */
  landingPageUrl: string;
  productTerms: string[]; // what's being advertised, short terms
  uniqueSellingPoints: string[];
  enhancePageUrls: string[]; // pages to pull/enhance assets from
  /** Page 6 — the asset group (AI pre-fills all of it). */
  headlines: string[]; // up to 15 × 30 chars
  longHeadlines: string[]; // up to 5 × 90 chars
  descriptions: string[]; // up to 5 × 90 chars
  imageUrls: { landscape: string[]; square: string[] };
  squareLogoUrl: string | null;
  businessNameShort: string; // 25 chars
  videoUrls: string[];
  sitelinks: Array<{ text: string; url: string }>;
  callToAction:
    | "LEARN_MORE" | "GET_QUOTE" | "APPLY_NOW" | "SIGN_UP" | "CONTACT_US"
    | "SUBSCRIBE" | "DOWNLOAD" | "BOOK_NOW" | "SHOP_NOW";
  /** Page 7 — bidding. */
  bidStrategy: "maximize_conversions" | "maximize_conversion_value";
  targetCpa?: number; // dollars, optional
  /** Page 8 — budget. */
  dailyBudget: number; // dollars (monthly budget / 30.4)
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
