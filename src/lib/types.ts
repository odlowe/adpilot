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

export interface CampaignPlan {
  adCopy: AdCopy;
  targeting: Targeting;
  estMonthlyReach: [number, number];
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
