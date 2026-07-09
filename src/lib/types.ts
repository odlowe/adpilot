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
  creativeUrl: string | null;
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
