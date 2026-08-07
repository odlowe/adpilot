export type Platform = "google" | "meta" | "reddit";

export type PlatformStatus = "draft" | "in_review" | "live" | "paused";

export type CampaignStatus = "active" | "paused" | "completed";

export type DigestFrequency = "daily" | "weekly" | "monthly";

export interface EmailPrefs {
  /** Master switch — false silences all non-essential email. */
  enabled: boolean;
  /** How often the automated all-campaigns performance digest goes out. */
  digestFrequency: DigestFrequency;
}

export const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  enabled: true,
  digestFrequency: "weekly",
};

export type BusinessCategory =
  | "Home Services"
  | "Retail/Boutique"
  | "Fitness/Gym"
  | "Professional Services"
  | "Political Campaign"
  | "Other";

export interface AdCopy {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
}

export interface Targeting {
  radiusMiles: number;
  audienceSummary: string;
  googleKeywords: string[];
  metaInterests: string[];
  redditInterests: string[];
}

/** Where an ad image is meant to run — drives its aspect ratio. */
export type CreativeFormat = "banner" | "landscape" | "square" | "vertical" | "custom";

/** One saved ad image (AI-generated or uploaded). */
export interface CampaignCreative {
  url: string;
  format: CreativeFormat;
  /** Description used to generate it — lets "Regenerate" re-run the idea. */
  prompt?: string;
  createdAt: string;
}

/** A brand asset the owner uploaded (logo, storefront, product shots…). */
export interface BrandingImage {
  url: string;
  label: "Logo" | "Storefront" | "Product/Work" | "Other";
}

/** Page 3 of the Google wizard — what the owner wants the ads to achieve. */
export type CampaignGoal =
  | "purchases"
  | "leads_form"
  | "leads_calls"
  | "page_views"
  | "brand_awareness";

export const CAMPAIGN_GOAL_KEYS: CampaignGoal[] = [
  "purchases",
  "leads_form",
  "leads_calls",
  "page_views",
  "brand_awareness",
];

/** Optional accounts a business can link (Google wizard page 2). */
export interface LinkedAccounts {
  /** Google Business Profile URL (or Maps listing link). */
  gbp?: string;
  /** YouTube channel or video URL — becomes the PMax video asset. */
  youtube?: string;
  /** Verification/call-tracking phone (defaults to the business phone). */
  phone?: string;
  /** Mobile app store URL, if they have an app. */
  appUrl?: string;
}

/**
 * The AI-written Performance Max asset group (Google wizard pages 4-6).
 * Char limits are Google's hard rules — enforced in code, not just prompts:
 * headlines ≤30, longHeadlines/descriptions ≤90, businessNameShort ≤25.
 */
export interface PmaxAssets {
  searchThemes: string[];
  productTerms: string[];
  uniqueSellingPoints: string[];
  headlines: string[]; // up to 15 × 30 chars
  longHeadlines: string[]; // up to 5 × 90 chars
  descriptions: string[]; // up to 5 × 90 chars
  businessNameShort: string; // ≤ 25 chars
}

/** Everything the wizard collects that Google's Performance Max needs. */
export interface GoogleAdsCampaignPlan {
  /** Page 3 — campaign goal. */
  goal: CampaignGoal;
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
  /** Political Campaign category only — US-law "Paid for by ..." line. */
  paidForBy?: string | null;
}

export interface CampaignPlan {
  adCopy: AdCopy;
  targeting: Targeting;
  estMonthlyReach: [number, number];
  /** Google PMax asset group — present on every newly generated plan. */
  pmax?: PmaxAssets;
}

export interface BillingInfo {
  nameOnCard: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
  billingZip: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  birthdate: string | null; // yyyy-mm-dd
  billingJson: BillingInfo | null;
  /** Stripe customer id, set the first time they complete Checkout. */
  stripeCustomerId: string | null;
  /** True while their Stripe subscription is in good standing. */
  billingActive: boolean;
  /** True once they've clicked the confirmation link we emailed. */
  emailVerified: boolean;
  emailPrefs: EmailPrefs;
  /** Consecutive wrong-password attempts (resets on success). */
  failedLogins: number;
  /** Login blocked until this time after 3 straight failures. */
  lockedUntil: string | null;
  createdAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface Business {
  id: string;
  userId: string;
  name: string;
  category: BusinessCategory;
  /** Free-text profile the AI uses for better copy & targeting. */
  description: string;
  address: string;
  phone: string;
  website: string;
  /** Brand assets fed to the AI when generating ad visuals. */
  brandingJson: BrandingImage[];
  /** Optional linked accounts (Google Business Profile, YouTube…). */
  linkedAccountsJson: LinkedAccounts;
  createdAt: string;
}

/** Percentage of budget per platform; always sums to 100. */
export type PlatformSplit = Record<Platform, number>;

export interface Campaign {
  id: string;
  userId: string;
  businessId: string;
  name: string;
  budget: number;
  zip: string;
  durationMonths: number;
  continuous: boolean;
  /** true when the owner used Manual Mode instead of letting the agent decide */
  manualMode: boolean;
  platformSplit: PlatformSplit;
  siteCategories: string[];
  customSites: string[];
  /** Primary creative (first of creativesJson) — kept for previews/thumbs. */
  creativeUrl: string | null;
  /** Every ad image on this campaign, across placements/sizes. */
  creativesJson: CampaignCreative[];
  industryText: string;
  targetingJson: Targeting;
  adCopyJson: AdCopy;
  platformStatuses: Record<Platform, PlatformStatus>;
  status: CampaignStatus;
  startDate: string;
  endDate: string | null;
  isSample: boolean;
  /** The full Google Performance Max plan assembled at launch (null = pre-Google-era campaign). */
  googleAdsJson: GoogleAdsCampaignPlan | null;
  /** Google's campaign id once actually published via the API. */
  googleCampaignId: string | null;
  /** Google-side status once published (enabled/paused/removed…). */
  googleStatus: string | null;
  createdAt: string;
}

/** Serializable draft handed from the landing-page configurator to the dashboard. */
export interface CampaignDraft {
  intentText: string;
  budget: number;
  radiusMiles: number;
  zip: string;
  durationMonths: number;
  continuous: boolean;
}
